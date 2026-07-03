import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, Filter, Syringe, FileText, TruckIcon, ShieldAlert, CalendarCheck } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const AlertsReminders = () => {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  // Load all alerts from Supabase
  useEffect(() => {
    if (user?.id) {
      loadAllAlerts();

      // Set up real-time subscriptions for live updates
      const subscriptions = setupRealtimeSubscriptions();

      return () => {
        // Cleanup subscriptions
        subscriptions.forEach(sub => sub.unsubscribe());
      };
    }
  }, [user?.id]);

  const setupRealtimeSubscriptions = () => {
    const subscriptions = [];

    // Subscribe to treatment changes
    const treatmentSub = supabase
      .channel('treatments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'treatments', filter: `farmer_id=eq.${user.id}` },
        () => loadAllAlerts()
      )
      .subscribe();
    subscriptions.push(treatmentSub);

    // Subscribe to treatment requests
    const requestSub = supabase
      .channel('treatment_requests_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'treatment_requests', filter: `farmer_id=eq.${user.id}` },
        () => loadAllAlerts()
      )
      .subscribe();
    subscriptions.push(requestSub);

    // Subscribe to inspections
    const inspectionSub = supabase
      .channel('inspections_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inspections' },
        () => loadAllAlerts()
      )
      .subscribe();
    subscriptions.push(inspectionSub);

    // Subscribe to prescriptions
    const prescriptionSub = supabase
      .channel('prescriptions_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prescriptions', filter: `farmer_id=eq.${user.id}` },
        () => loadAllAlerts()
      )
      .subscribe();
    subscriptions.push(prescriptionSub);

    return subscriptions;
  };

  const loadAllAlerts = async () => {
    try {
      setLoading(true);
      const allAlerts = [];

      // 1. Withdrawal Period Alerts (from treatments and amu_records)
      const withdrawalAlerts = await getWithdrawalAlerts();
      allAlerts.push(...withdrawalAlerts);

      // 2. Treatment Request Alerts
      const treatmentRequestAlerts = await getTreatmentRequestAlerts();
      allAlerts.push(...treatmentRequestAlerts);

      // 3. Prescription Alerts
      const prescriptionAlerts = await getPrescriptionAlerts();
      allAlerts.push(...prescriptionAlerts);

      // 4. Inspection Alerts
      const inspectionAlerts = await getInspectionAlerts();
      allAlerts.push(...inspectionAlerts);

      // 5. Collection Record Alerts
      const collectionAlerts = await getCollectionAlerts();
      allAlerts.push(...collectionAlerts);

      // 6. Regulatory Action Alerts
      const regulatoryAlerts = await getRegulatoryAlerts();
      allAlerts.push(...regulatoryAlerts);

      // Sort by timestamp (most recent first)
      allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  // Get withdrawal period ending alerts
  const getWithdrawalAlerts = async () => {
    const alerts = [];

    try {
      // Get active treatments with upcoming withdrawal end dates
      const { data: treatments, error } = await supabase
        .from('treatments')
        .select('*, livestock:livestock_id(tag_id, name, species)')
        .eq('farmer_id', user.id)
        .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])
        .order('withdrawal_end_date', { ascending: true });

      if (error) throw error;

      treatments?.forEach(treatment => {
        const endDate = new Date(treatment.withdrawal_end_date);
        const today = new Date();
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 7 && daysRemaining >= 0) {
          const priority = daysRemaining <= 1 ? 'high' : daysRemaining <= 3 ? 'medium' : 'low';
          const animalName = treatment.livestock?.name || treatment.livestock?.tag_id || 'Unknown';

          alerts.push({
            id: `withdrawal-${treatment.id}`,
            type: 'withdrawal',
            priority,
            title: 'Withdrawal Period Ending',
            message: `${treatment.livestock?.species || 'Animal'} "${animalName}" - Withdrawal for ${treatment.drug_name} ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
            animalId: treatment.livestock?.tag_id,
            timestamp: treatment.administration_date,
            status: 'active',
            actionRequired: daysRemaining <= 1,
            metadata: {
              treatmentId: treatment.id,
              drugName: treatment.drug_name,
              endDate: treatment.withdrawal_end_date
            }
          });
        }
      });
    } catch (error) {
      console.error('Error fetching withdrawal alerts:', error);
    }

    return alerts;
  };

  // Get treatment request alerts
  const getTreatmentRequestAlerts = async () => {
    const alerts = [];

    try {
      const { data: requests, error } = await supabase
        .from('treatment_requests')
        .select('*')
        .eq('farmer_id', user.id)
        .in('status', ['pending', 'assigned', 'consulted', 'prescription_given'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      requests?.forEach(request => {
        let priority = 'medium';
        let title = 'Treatment Request Update';
        let message = '';
        let actionRequired = false;

        switch (request.status) {
          case 'pending':
            priority = request.urgency === 'emergency' ? 'high' : 'medium';
            title = 'Treatment Request Pending';
            message = `Your request for ${request.animal_name} is awaiting veterinarian assignment`;
            break;
          case 'assigned':
            priority = 'medium';
            title = 'Veterinarian Assigned';
            message = `Dr. ${request.veterinarian_name} has been assigned to treat ${request.animal_name}`;
            actionRequired = true;
            break;
          case 'consulted':
            priority = 'medium';
            title = 'Consultation Completed';
            message = `Consultation completed for ${request.animal_name}. Awaiting prescription`;
            break;
          case 'prescription_given':
            priority = 'high';
            title = 'Prescription Ready';
            message = `Prescription available for ${request.animal_name}. Please review and collect medicines`;
            actionRequired = true;
            break;
        }

        alerts.push({
          id: `request-${request.id}`,
          type: 'treatment_request',
          priority,
          title,
          message,
          animalId: request.animal_tag,
          timestamp: request.updated_at || request.created_at,
          status: 'active',
          actionRequired,
          metadata: {
            requestId: request.request_id,
            status: request.status,
            veterinarianName: request.veterinarian_name
          }
        });
      });
    } catch (error) {
      console.error('Error fetching treatment request alerts:', error);
    }

    return alerts;
  };

  // Get prescription alerts
  const getPrescriptionAlerts = async () => {
    const alerts = [];

    try {
      const { data: prescriptions, error } = await supabase
        .from('prescriptions')
        .select('*, livestock:livestock_id(tag_id, name, species)')
        .eq('farmer_id', user.id)
        .eq('status', 'active')
        .eq('is_dispensed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      prescriptions?.forEach(prescription => {
        const animalName = prescription.livestock?.name || prescription.livestock?.tag_id || 'Unknown';

        alerts.push({
          id: `prescription-${prescription.id}`,
          type: 'prescription',
          priority: 'medium',
          title: 'New Prescription Available',
          message: `Prescription for ${prescription.livestock?.species || 'Animal'} "${animalName}" - ${prescription.diagnosis}. Please collect medicines from pharmacy`,
          animalId: prescription.livestock?.tag_id,
          timestamp: prescription.created_at,
          status: 'active',
          actionRequired: true,
          metadata: {
            prescriptionId: prescription.prescription_id,
            diagnosis: prescription.diagnosis,
            followUpRequired: prescription.follow_up_required
          }
        });
      });
    } catch (error) {
      console.error('Error fetching prescription alerts:', error);
    }

    return alerts;
  };

  // Get inspection alerts
  const getInspectionAlerts = async () => {
    const alerts = [];

    try {
      // Get farmer's farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id, farm_id, name')
        .eq('farmer_id', user.id);

      if (!farms || farms.length === 0) return alerts;

      const farmIds = farms.map(f => f.id);

      const { data: inspections, error } = await supabase
        .from('inspections')
        .select('*')
        .in('farm_id', farmIds)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      inspections?.forEach(inspection => {
        const scheduledDate = new Date(inspection.scheduled_date);
        const today = new Date();
        const daysUntil = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));

        const priority = daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low';
        const farm = farms.find(f => f.id === inspection.farm_id);

        alerts.push({
          id: `inspection-${inspection.id}`,
          type: 'inspection',
          priority,
          title: inspection.status === 'in_progress' ? 'Inspection In Progress' : 'Upcoming Inspection',
          message: `${inspection.inspection_type} inspection ${inspection.status === 'in_progress' ? 'ongoing' : `scheduled in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`} at ${farm?.name || 'your farm'}`,
          timestamp: inspection.created_at,
          status: 'active',
          actionRequired: daysUntil <= 1,
          metadata: {
            inspectionType: inspection.inspection_type,
            scheduledDate: inspection.scheduled_date,
            farmName: farm?.name,
            inspectorName: inspection.inspector_name
          }
        });
      });
    } catch (error) {
      console.error('Error fetching inspection alerts:', error);
    }

    return alerts;
  };

  // Get collection record alerts
  const getCollectionAlerts = async () => {
    const alerts = [];

    try {
      // Get farmer's farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id, farm_id, name')
        .eq('farmer_id', user.id);

      if (!farms || farms.length === 0) return alerts;

      const farmIds = farms.map(f => f.id);

      const { data: collections, error } = await supabase
        .from('collection_records')
        .select('*')
        .in('farm_id', farmIds)
        .eq('can_accept', false)
        .gte('collection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('collection_date', { ascending: false });

      if (error) throw error;

      collections?.forEach(collection => {
        alerts.push({
          id: `collection-${collection.id}`,
          type: 'collection',
          priority: 'high',
          title: 'Milk Collection Rejected',
          message: `Collection rejected: ${collection.rejection_reason}. Quantity: ${collection.quantity_collected} ${collection.unit}`,
          timestamp: collection.created_at,
          status: 'active',
          actionRequired: true,
          metadata: {
            rejectionReason: collection.rejection_reason,
            quantity: collection.quantity_collected,
            collectionDate: collection.collection_date
          }
        });
      });
    } catch (error) {
      console.error('Error fetching collection alerts:', error);
    }

    return alerts;
  };

  // Get regulatory action alerts
  const getRegulatoryAlerts = async () => {
    const alerts = [];

    try {
      // Get farmer's farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id, farm_id, name')
        .eq('farmer_id', user.id);

      if (!farms || farms.length === 0) return alerts;

      const farmIds = farms.map(f => f.farm_id);

      const { data: actions, error } = await supabase
        .from('regulatory_actions')
        .select('*')
        .eq('entity_type', 'farm')
        .in('entity_public_id', farmIds)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      actions?.forEach(action => {
        const priority = action.action_level === 'critical' ? 'high' : action.action_level === 'high' ? 'medium' : 'low';

        alerts.push({
          id: `regulatory-${action.id}`,
          type: 'compliance',
          priority,
          title: 'Regulatory Action Required',
          message: `${action.action_type}: ${action.reason}`,
          timestamp: action.created_at,
          status: 'active',
          actionRequired: true,
          metadata: {
            actionType: action.action_type,
            reason: action.reason,
            actionLevel: action.action_level,
            notes: action.notes
          }
        });
      });
    } catch (error) {
      console.error('Error fetching regulatory alerts:', error);
    }

    return alerts;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'withdrawal': return <Clock className="w-5 h-5" />;
      case 'treatment_request': return <Syringe className="w-5 h-5" />;
      case 'prescription': return <FileText className="w-5 h-5" />;
      case 'inspection': return <CalendarCheck className="w-5 h-5" />;
      case 'collection': return <TruckIcon className="w-5 h-5" />;
      case 'compliance': return <ShieldAlert className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return alert.status === 'active';
    if (filter === 'action') return alert.actionRequired;
    return alert.type === filter;
  });

  const markAsRead = async (alertId) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId ? { ...alert, status: 'read' } : alert
    ));
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Alerts & Reminders</h2>
            <p className="text-gray-600">Real-time updates from your farm operations</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => loadAllAlerts()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
            </button>
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {alerts.filter(a => a.status === 'active').length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 p-6 border-b bg-gray-50">
          {['all', 'unread', 'action', 'withdrawal', 'treatment_request', 'prescription', 'inspection', 'collection', 'compliance'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-blue-50'
                }`}
            >
              {filterType.replace('_', ' ')}
              {filterType === 'all' && ` (${alerts.length})`}
              {filterType === 'unread' && ` (${alerts.filter(a => a.status === 'active').length})`}
              {filterType === 'action' && ` (${alerts.filter(a => a.actionRequired).length})`}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="divide-y">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No alerts matching your filter</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${alert.status === 'active' ? 'bg-blue-50/30' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{alert.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                        {alert.actionRequired && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.animalId && <span>Animal: {alert.animalId}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                {alert.actionRequired && (
                  <div className="mt-4 flex space-x-2 flex-wrap gap-2">
                    {alert.type === 'withdrawal' && (
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                        Mark Ready for Market
                      </button>
                    )}
                    {alert.type === 'treatment_request' && (
                      <>
                        <button
                          onClick={() => window.location.href = '/app/vet-connect'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                          View Request Details
                        </button>
                      </>
                    )}
                    {alert.type === 'prescription' && (
                      <button
                        onClick={() => window.location.href = '/app/vet-connect'}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                      >
                        View Prescription
                      </button>
                    )}
                    {alert.type === 'inspection' && (
                      <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors">
                        Prepare for Inspection
                      </button>
                    )}
                    {alert.type === 'collection' && (
                      <button
                        onClick={() => window.location.href = '/app/administration'}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Review Treatment Records
                      </button>
                    )}
                    {alert.type === 'compliance' && (
                      <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors">
                        Take Action
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t p-6 bg-gray-50">
            <h3 className="font-semibold mb-4">Notification Settings</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Withdrawal period alerts</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Treatment request updates</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Prescription notifications</span>
                </label>
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Inspection schedules</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Collection rejections</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span>Compliance alerts</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsReminders;