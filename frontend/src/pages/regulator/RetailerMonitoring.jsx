import React, { useEffect, useMemo, useState } from 'react';
import statesData from '../../data/states-and-districts.json';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import {
  CubeIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

const RetailerMonitoring = () => {
  // --- State Management ---
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  // Default dates: First day of current month to today
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [salesLogs, setSalesLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- Dummy Data ---
  const dummyData = [
    { retailer_id: 'RET-20251201-001', retailer_name: 'Patel Veterinary Store', farmer_id: 'PRD-20251201-0013', farmer_name: 'Ramesh Kumar', vet_id: 'VET-20251201-0006', vet_name: 'Dr. Sharma', drug_name: 'Amoxicillin', quantity: 50, date: '2025-12-01', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-002', retailer_name: 'Singh Agro Medical', farmer_id: 'PRD-20251202-0025', farmer_name: 'Suresh Patel', vet_id: 'VET-20251201-0008', vet_name: 'Dr. Verma', drug_name: 'Oxytetracycline', quantity: 75, date: '2025-12-02', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-003', retailer_name: 'Gupta Animal Care', farmer_id: 'PRD-20251203-0045', farmer_name: 'Mohan Singh', vet_id: 'VET-20251201-0012', vet_name: 'Dr. Kumar', drug_name: 'Enrofloxacin', quantity: 40, date: '2025-12-03', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-004', retailer_name: 'Sharma Veterinary Depot', farmer_id: 'PRD-20251204-0067', farmer_name: 'Prakash Sharma', vet_id: 'VET-20251201-0015', vet_name: 'Dr. Patel', drug_name: 'Ivermectin', quantity: 30, date: '2025-12-04', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-005', retailer_name: 'Mishra Animal Health', farmer_id: 'PRD-20251205-0089', farmer_name: 'Rajesh Mishra', vet_id: 'VET-20251201-0018', vet_name: 'Dr. Singh', drug_name: 'Gentamicin', quantity: 60, date: '2025-12-05', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-006', retailer_name: 'Kumar Vet Solutions', farmer_id: 'PRD-20251206-0101', farmer_name: 'Dinesh Kumar', vet_id: 'VET-20251201-0021', vet_name: 'Dr. Mishra', drug_name: 'Penicillin', quantity: 45, date: '2025-12-06', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-007', retailer_name: 'Verma Agro Vet', farmer_id: 'PRD-20251207-0123', farmer_name: 'Anil Verma', vet_id: 'VET-20251201-0024', vet_name: 'Dr. Gupta', drug_name: 'Ceftriaxone', quantity: 55, date: '2025-12-07', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-008', retailer_name: 'Yadav Animal Pharmacy', farmer_id: 'PRD-20251208-0145', farmer_name: 'Vijay Yadav', vet_id: 'VET-20251201-0027', vet_name: 'Dr. Yadav', drug_name: 'Doxycycline', quantity: 35, date: '2025-12-08', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-009', retailer_name: 'Tiwari Vet Care', farmer_id: 'PRD-20251209-0167', farmer_name: 'Manoj Tiwari', vet_id: 'VET-20251201-0030', vet_name: 'Dr. Tiwari', drug_name: 'Tetracycline', quantity: 70, date: '2025-12-09', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-010', retailer_name: 'Joshi Animal Clinic Store', farmer_id: 'PRD-20251201-0189', farmer_name: 'Santosh Joshi', vet_id: 'VET-20251201-0033', vet_name: 'Dr. Joshi', drug_name: 'Florfenicol', quantity: 25, date: '2025-12-01', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-011', retailer_name: 'Pandey Vet Supplies', farmer_id: 'PRD-20251202-0201', farmer_name: 'Ravi Pandey', vet_id: 'VET-20251201-0036', vet_name: 'Dr. Pandey', drug_name: 'Tylosin', quantity: 80, date: '2025-12-02', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-012', retailer_name: 'Saxena Animal Health Hub', farmer_id: 'PRD-20251203-0223', farmer_name: 'Ashok Saxena', vet_id: 'VET-20251201-0039', vet_name: 'Dr. Saxena', drug_name: 'Neomycin', quantity: 65, date: '2025-12-03', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-013', retailer_name: 'Agarwal Vet Pharmacy', farmer_id: 'PRD-20251204-0245', farmer_name: 'Deepak Agarwal', vet_id: 'VET-20251201-0042', vet_name: 'Dr. Agarwal', drug_name: 'Ciprofloxacin', quantity: 42, date: '2025-12-04', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-014', retailer_name: 'Chaturvedi Animal Care', farmer_id: 'PRD-20251205-0267', farmer_name: 'Sanjay Chaturvedi', vet_id: 'VET-20251201-0045', vet_name: 'Dr. Chaturvedi', drug_name: 'Streptomycin', quantity: 58, date: '2025-12-05', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-015', retailer_name: 'Dubey Vet Center', farmer_id: 'PRD-20251206-0289', farmer_name: 'Narendra Dubey', vet_id: 'VET-20251201-0048', vet_name: 'Dr. Dubey', drug_name: 'Ceftiofur', quantity: 48, date: '2025-12-06', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-016', retailer_name: 'Tripathi Animal Solutions', farmer_id: 'PRD-20251207-0301', farmer_name: 'Gopal Tripathi', vet_id: 'VET-20251201-0051', vet_name: 'Dr. Tripathi', drug_name: 'Lincomycin', quantity: 52, date: '2025-12-07', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-017', retailer_name: 'Shukla Vet Depot', farmer_id: 'PRD-20251208-0323', farmer_name: 'Hari Shukla', vet_id: 'VET-20251201-0054', vet_name: 'Dr. Shukla', drug_name: 'Tilmicosin', quantity: 38, date: '2025-12-08', state: 'Madhya Pradesh', district: 'Indore' },
    { retailer_id: 'RET-20251201-018', retailer_name: 'Dwivedi Animal Medical', farmer_id: 'PRD-20251209-0345', farmer_name: 'Krishna Dwivedi', vet_id: 'VET-20251201-0057', vet_name: 'Dr. Dwivedi', drug_name: 'Spectinomycin', quantity: 72, date: '2025-12-09', state: 'Madhya Pradesh', district: 'Sehore' },
    { retailer_id: 'RET-20251201-019', retailer_name: 'Srivastava Vet Store', farmer_id: 'PRD-20251201-0367', farmer_name: 'Rajendra Srivastava', vet_id: 'VET-20251201-0060', vet_name: 'Dr. Srivastava', drug_name: 'Sulfadiazine', quantity: 44, date: '2025-12-01', state: 'Madhya Pradesh', district: 'Bhopal' },
    { retailer_id: 'RET-20251201-020', retailer_name: 'Bharti Animal Health', farmer_id: 'PRD-20251202-0389', farmer_name: 'Mukesh Bharti', vet_id: 'VET-20251201-0063', vet_name: 'Dr. Bharti', drug_name: 'Trimethoprim', quantity: 62, date: '2025-12-02', state: 'Madhya Pradesh', district: 'Indore' }
  ];

  // --- Real Data Fetching ---
  const fetchRealData = async () => {
    setLoading(true);
    setSalesLogs([]);
    setDataLoaded(false);

    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Applying filters:', { selectedState, selectedDistrict, fromDate, toDate });

      // Filter dummy data
      let filteredData = dummyData;

      // MUST select state
      if (!selectedState) {
        toast.error('Please select a state first');
        setLoading(false);
        return;
      }

      // Filter by state
      filteredData = filteredData.filter(item => item.state === selectedState);

      // Filter by district if selected
      if (selectedDistrict) {
        filteredData = filteredData.filter(item => item.district === selectedDistrict);
      }

      // Filter by date range
      filteredData = filteredData.filter(item => {
        const itemDate = item.date;
        return itemDate >= fromDate && itemDate <= toDate;
      });

      console.log(`Found ${filteredData.length} records after filtering`);

      // Format for display
      const formattedLogs = filteredData.map(item => ({
        ...item,
        display_date: new Date(item.date).toLocaleDateString('en-IN'),
        raw_date: item.date,
        shop_name: item.retailer_name,
        shop_district: item.district,
        buyer_name: item.farmer_name,
        buyer_id: item.farmer_id,
        quantity_sold: item.quantity
      }));

      setSalesLogs(formattedLogs);
      setDataLoaded(true);
      toast.success(`Loaded ${formattedLogs.length} sales records`);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load sales records');
    } finally {
      setLoading(false);
    }
  };  // --- Insights Calculation ---
  const insights = useMemo(() => {
    const totalQuantity = salesLogs.reduce((sum, item) => sum + (item.quantity || item.quantity_sold || 0), 0);
    const uniqueRetailers = [...new Set(salesLogs.map(item => item.retailer_id))].length;
    const uniqueVets = [...new Set(salesLogs.map(item => item.vet_id))].length;
    
    // Timeline Data (Group by Date)
    const timelineMap = {};
    salesLogs.forEach(log => {
      const dateKey = log.raw_date;
      if (!timelineMap[dateKey]) timelineMap[dateKey] = 0;
      timelineMap[dateKey] += (log.quantity || log.quantity_sold || 0);
    });
    const timelineData = Object.keys(timelineMap)
      .sort()
      .map(date => ({ date, quantity: timelineMap[date] }));

    // District Data (Group by Shop's District)
    const districtMap = {};
    salesLogs.forEach(log => {
      const dist = log.shop_district || log.district;
      if (!districtMap[dist]) districtMap[dist] = 0;
      districtMap[dist] += (log.quantity || log.quantity_sold || 0);
    });
    const districtData = Object.keys(districtMap).map(d => ({ name: d, quantity: districtMap[d] }));

    return { totalQuantity, uniqueRetailers, uniqueVets, timelineData, districtData };
  }, [salesLogs]);

  // --- Helper: District Options ---
  const districtOptions = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = statesData.states.find(s => s.state === selectedState);
    return stateObj ? stateObj.districts : [];
  }, [selectedState]);

  // --- PDF Export Logic ---
  const handleDownloadPDF = () => {
    if (salesLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('Sales Quantity Log', 14, 22);
    
    // Metadata
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 30);
    doc.text(`Region: ${selectedDistrict || selectedState || 'All Regions'}`, 14, 36);
    doc.text(`Total Records: ${salesLogs.length} | Total Units: ${insights.totalQuantity}`, 14, 42);

    // Table Columns
    const tableColumn = ["Date", "Retailer", "Farmer", "Veterinarian", "Drug", "Qty"];
    const tableRows = [];

    salesLogs.forEach(log => {
      const rowData = [
        log.display_date,
        `${log.retailer_name}\n(${log.retailer_id})`,
        `${log.farmer_name}\n(${log.farmer_id})`,
        `${log.vet_name}\n(${log.vet_id})`,
        log.drug_name,
        `${log.quantity || log.quantity_sold} units`
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] } // Indigo
    });

    doc.save(`sales_log_${fromDate}_${toDate}.pdf`);
  };

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Records</h1>
          <p className="text-sm text-gray-600">Real-time quantity tracking (Financials excluded).</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchRealData}
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow transition ${
              loading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={loading || salesLogs.length === 0}
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow transition ${
              loading || salesLogs.length === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Download PDF Log
          </button>
        </div>
      </div>

      {/* 2. Filters */}
      <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 mb-3 font-medium text-indigo-700">
          <FunnelIcon className="w-5 h-5" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* State */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-500">State</label>
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(''); }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All States</option>
              {statesData.states.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-500">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex items-center justify-between p-4 bg-white border border-indigo-100 shadow-sm rounded-xl">
          <div>
            <p className="text-sm text-gray-500">Total Quantity Sold</p>
            <p className="text-2xl font-bold text-indigo-600">
              {insights.totalQuantity.toLocaleString()} <span className="text-sm font-normal text-gray-400">units</span>
            </p>
          </div>
          <CubeIcon className="w-10 h-10 text-indigo-200" />
        </div>
        
        <div className="flex items-center justify-between p-4 bg-white border border-blue-100 shadow-sm rounded-xl">
          <div>
            <p className="text-sm text-gray-500">Active Retailers</p>
            <p className="text-2xl font-bold text-blue-600">{insights.uniqueRetailers}</p>
          </div>
          <MapPinIcon className="w-10 h-10 text-blue-200" />
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-purple-100 shadow-sm rounded-xl">
          <div>
            <p className="text-sm text-gray-500">Registered Veterinarians</p>
            <p className="text-2xl font-bold text-purple-600">{insights.uniqueVets}</p>
          </div>
          <ClipboardDocumentListIcon className="w-10 h-10 text-purple-200" />
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-green-100 shadow-sm rounded-xl">
          <div>
            <p className="text-sm text-gray-500">Records Found</p>
            <p className="text-2xl font-bold text-green-600">{salesLogs.length}</p>
          </div>
          <CalendarDaysIcon className="w-10 h-10 text-green-200" />
        </div>
      </div>

      {/* 4. Charts Section */}
      {salesLogs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Timeline */}
            <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h3 className="mb-4 font-semibold text-gray-800 text-md">Daily Sales Volume</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="quantity" stroke="#4F46E5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
                </ResponsiveContainer>
            </div>
            </div>

            {/* District Distribution */}
            <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h3 className="mb-4 font-semibold text-gray-800 text-md">Volume by District</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.districtData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip cursor={{fill: '#F3F4F6'}} />
                    <Bar dataKey="quantity" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      )}

      {/* 5. Detailed Logs Table */}
      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <ClipboardDocumentListIcon className="w-5 h-5 text-gray-500"/>
            <h3 className="font-semibold text-gray-900">Complete Sales Log</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold tracking-wider text-gray-500 uppercase bg-gray-50">
                <th className="px-6 py-3 border-b">Date</th>
                <th className="px-6 py-3 border-b">Retailer</th>
                <th className="px-6 py-3 border-b">Farmer</th>
                <th className="px-6 py-3 border-b">Veterinarian</th>
                <th className="px-6 py-3 border-b">Drug Name</th>
                <th className="px-6 py-3 text-right border-b">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="inline-block w-6 h-6 mb-2 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <p>Fetching data from Supabase...</p>
                  </td>
                </tr>
              ) : salesLogs.length > 0 ? (
                salesLogs.map((log) => (
                  <tr key={log.retailer_id + log.date} className="transition-colors hover:bg-gray-50">
                    {/* Date */}
                    <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {log.display_date}
                    </td>

                    {/* Retailer Details */}
                    <td className="px-6 py-3 text-sm">
                        <div className="font-medium text-gray-900">{log.retailer_name}</div>
                        <div className="text-xs text-gray-500">{log.retailer_id}</div>
                    </td>

                    {/* Farmer Details */}
                    <td className="px-6 py-3 text-sm">
                        <div className="font-medium text-gray-900">{log.farmer_name}</div>
                        <div className="text-xs text-gray-500">{log.farmer_id}</div>
                    </td>

                    {/* Vet Details */}
                    <td className="px-6 py-3 text-sm">
                        <div className="font-medium text-gray-900">{log.vet_name}</div>
                        <div className="text-xs text-gray-500">{log.vet_id}</div>
                    </td>

                    {/* Drug */}
                    <td className="px-6 py-3 text-sm text-gray-900">
                        {log.drug_name}
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-3 text-sm font-semibold text-right text-indigo-700">
                        {log.quantity || log.quantity_sold} <span className="text-xs font-normal text-gray-500">units</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {dataLoaded 
                      ? 'No sales records found for the selected filters.'
                      : 'Select Madhya Pradesh state, choose date range, and click "Apply Filters" to load data.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default RetailerMonitoring;