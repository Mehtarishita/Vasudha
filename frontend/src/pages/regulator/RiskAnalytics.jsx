import React, { useMemo, useState } from 'react'
import statesData from '../../data/states-and-districts.json'
import {
  ArrowDownTrayIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const RiskAnalytics = () => {
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [records, setRecords] = useState([])
  const [enrichedAMURecords, setEnrichedAMURecords] = useState([])

  const [totalAmuVolume, setTotalAmuVolume] = useState(0)
  const [mostUsedDrug, setMostUsedDrug] = useState({
    name: null,
    volume: 0,
    count: 0
  })
  const [totalAMUkg, setTotalAMUkg] = useState(0)
  const [totalBiomassPCU, setTotalBiomassPCU] = useState(0)
  const [usageIntensity, setUsageIntensity] = useState(0)
  const [ciaPercentage, setCiaPercentage] = useState(0)
  const [topDisease, setTopDisease] = useState('N/A')

  const [sortField, setSortField] = useState('administration_date')
  const [sortDirection, setSortDirection] = useState('desc')

  // --- Dummy AMU Data (25 records) ---
  const dummyAMUData = [
    { livestock_id: 'C-9921', drug_name: 'Oxytetracycline', date: '2025-11-28', farmer_id: 'PRD-20251119-0002', farmer_name: 'Ramesh Kumar', farm_id: 'F-102', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Sharma', vet_id: 'VET-20251201-0006', state: 'Madhya Pradesh', district: 'Sehore', dosage: '15 mL', route: 'Injection', amu_volume: '1,500 mg', amu_kg: 1.5, biomass_pcu: 450, diagnosis: 'Mastitis', drug_category: 'Tetracyclines', is_cia: false, volume: 15 },
    { livestock_id: 'B-200', drug_name: 'Colistin Sulfate', date: '2025-11-28', farmer_id: 'PRD-20251120-0015', farmer_name: 'Suresh Patel', farm_id: 'F-305', livestock_type: 'Poultry', prescription: 'Yes', vet_name: 'Dr. Verma', vet_id: 'VET-20251201-0008', state: 'Madhya Pradesh', district: 'Sehore', dosage: '100 g', route: 'Oral (Water)', amu_volume: '10,000 mg', amu_kg: 10.0, biomass_pcu: 150, diagnosis: 'Enteritis', drug_category: 'Polymyxins', is_cia: true, volume: 100 },
    { livestock_id: 'G-4412', drug_name: 'Meloxicam', date: '2025-11-29', farmer_id: 'PRD-20251121-0023', farmer_name: 'Mohan Singh', farm_id: 'F-088', livestock_type: 'Goat', prescription: 'No', vet_name: 'Dr. Sharma', vet_id: 'VET-20251201-0012', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '3 mL', route: 'Injection', amu_volume: '15 mg', amu_kg: 0.015, biomass_pcu: 40, diagnosis: 'Injury/Pain', drug_category: 'NSAIDs', is_cia: false, volume: 3 },
    { livestock_id: 'B-7721', drug_name: 'Ivermectin', date: '2025-11-29', farmer_id: 'PRD-20251122-0034', farmer_name: 'Prakash Sharma', farm_id: 'F-112', livestock_type: 'Buffalo', prescription: 'Yes', vet_name: 'Self-Reported', vet_id: 'Self-Reported', state: 'Madhya Pradesh', district: 'Sehore', dosage: '50 mL', route: 'Pour-on', amu_volume: '250 mg', amu_kg: 0.25, biomass_pcu: 500, diagnosis: 'Parasites', drug_category: 'Antiparasitics', is_cia: false, volume: 50 },
    { livestock_id: 'C-8832', drug_name: 'Gentamicin', date: '2025-12-01', farmer_id: 'PRD-20251123-0045', farmer_name: 'Rajesh Mishra', farm_id: 'F-156', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Singh', vet_id: 'VET-20251201-0018', state: 'Madhya Pradesh', district: 'Indore', dosage: '10 mL', route: 'Injection', amu_volume: '500 mg', amu_kg: 0.5, biomass_pcu: 450, diagnosis: 'Respiratory Infection', drug_category: 'Aminoglycosides', is_cia: false, volume: 10 },
    { livestock_id: 'B-5543', drug_name: 'Penicillin', date: '2025-12-01', farmer_id: 'PRD-20251124-0056', farmer_name: 'Dinesh Kumar', farm_id: 'F-221', livestock_type: 'Buffalo', prescription: 'No', vet_name: 'Dr. Mishra', vet_id: 'VET-20251201-0021', state: 'Madhya Pradesh', district: 'Sehore', dosage: '20 mL', route: 'Injection', amu_volume: '2,000 mg', amu_kg: 2.0, biomass_pcu: 500, diagnosis: 'Wound Infection', drug_category: 'Penicillins', is_cia: false, volume: 20 },
    { livestock_id: 'G-3321', drug_name: 'Ceftriaxone', date: '2025-12-02', farmer_id: 'PRD-20251125-0067', farmer_name: 'Anil Verma', farm_id: 'F-089', livestock_type: 'Goat', prescription: 'Yes', vet_name: 'Dr. Gupta', vet_id: 'VET-20251201-0024', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '5 mL', route: 'Injection', amu_volume: '250 mg', amu_kg: 0.25, biomass_pcu: 40, diagnosis: 'Pneumonia', drug_category: 'Cephalosporins', is_cia: true, volume: 5 },
    { livestock_id: 'P-1122', drug_name: 'Doxycycline', date: '2025-12-02', farmer_id: 'PRD-20251126-0078', farmer_name: 'Vijay Yadav', farm_id: 'F-334', livestock_type: 'Poultry', prescription: 'Yes', vet_name: 'Dr. Yadav', vet_id: 'VET-20251201-0027', state: 'Madhya Pradesh', district: 'Indore', dosage: '80 g', route: 'Oral (Water)', amu_volume: '8,000 mg', amu_kg: 8.0, biomass_pcu: 150, diagnosis: 'Respiratory Disease', drug_category: 'Tetracyclines', is_cia: false, volume: 80 },
    { livestock_id: 'C-7654', drug_name: 'Tetracycline', date: '2025-12-03', farmer_id: 'PRD-20251127-0089', farmer_name: 'Manoj Tiwari', farm_id: 'F-445', livestock_type: 'Dairy Cow', prescription: 'No', vet_name: 'Dr. Tiwari', vet_id: 'VET-20251201-0030', state: 'Madhya Pradesh', district: 'Sehore', dosage: '12 mL', route: 'Injection', amu_volume: '1,200 mg', amu_kg: 1.2, biomass_pcu: 450, diagnosis: 'Eye Infection', drug_category: 'Tetracyclines', is_cia: false, volume: 12 },
    { livestock_id: 'B-9988', drug_name: 'Florfenicol', date: '2025-12-03', farmer_id: 'PRD-20251128-0090', farmer_name: 'Santosh Joshi', farm_id: 'F-198', livestock_type: 'Buffalo', prescription: 'Yes', vet_name: 'Dr. Joshi', vet_id: 'VET-20251201-0033', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '8 mL', route: 'Injection', amu_volume: '800 mg', amu_kg: 0.8, biomass_pcu: 500, diagnosis: 'Foot Infection', drug_category: 'Amphenicols', is_cia: false, volume: 8 },
    { livestock_id: 'P-4455', drug_name: 'Enrofloxacin', date: '2025-12-04', farmer_id: 'PRD-20251129-0101', farmer_name: 'Ravi Pandey', farm_id: 'F-267', livestock_type: 'Poultry', prescription: 'Yes', vet_name: 'Dr. Pandey', vet_id: 'VET-20251201-0036', state: 'Madhya Pradesh', district: 'Indore', dosage: '120 g', route: 'Oral (Feed)', amu_volume: '12,000 mg', amu_kg: 12.0, biomass_pcu: 150, diagnosis: 'Mycoplasma', drug_category: 'Fluoroquinolones', is_cia: true, volume: 120 },
    { livestock_id: 'G-6677', drug_name: 'Neomycin', date: '2025-12-04', farmer_id: 'PRD-20251130-0112', farmer_name: 'Ashok Saxena', farm_id: 'F-378', livestock_type: 'Goat', prescription: 'No', vet_name: 'Dr. Saxena', vet_id: 'VET-20251201-0039', state: 'Madhya Pradesh', district: 'Sehore', dosage: '6 mL', route: 'Oral', amu_volume: '300 mg', amu_kg: 0.3, biomass_pcu: 40, diagnosis: 'Diarrhea', drug_category: 'Aminoglycosides', is_cia: false, volume: 6 },
    { livestock_id: 'C-5566', drug_name: 'Ciprofloxacin', date: '2025-12-05', farmer_id: 'PRD-20251201-0123', farmer_name: 'Deepak Agarwal', farm_id: 'F-489', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Agarwal', vet_id: 'VET-20251201-0042', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '14 mL', route: 'Injection', amu_volume: '1,400 mg', amu_kg: 1.4, biomass_pcu: 450, diagnosis: 'Urinary Infection', drug_category: 'Fluoroquinolones', is_cia: true, volume: 14 },
    { livestock_id: 'B-3344', drug_name: 'Streptomycin', date: '2025-12-05', farmer_id: 'PRD-20251202-0134', farmer_name: 'Sanjay Chaturvedi', farm_id: 'F-590', livestock_type: 'Buffalo', prescription: 'Yes', vet_name: 'Dr. Chaturvedi', vet_id: 'VET-20251201-0045', state: 'Madhya Pradesh', district: 'Indore', dosage: '16 mL', route: 'Injection', amu_volume: '1,600 mg', amu_kg: 1.6, biomass_pcu: 500, diagnosis: 'Joint Infection', drug_category: 'Aminoglycosides', is_cia: false, volume: 16 },
    { livestock_id: 'G-2211', drug_name: 'Ceftiofur', date: '2025-12-06', farmer_id: 'PRD-20251203-0145', farmer_name: 'Narendra Dubey', farm_id: 'F-601', livestock_type: 'Goat', prescription: 'No', vet_name: 'Dr. Dubey', vet_id: 'VET-20251201-0048', state: 'Madhya Pradesh', district: 'Sehore', dosage: '4 mL', route: 'Injection', amu_volume: '200 mg', amu_kg: 0.2, biomass_pcu: 40, diagnosis: 'Mastitis', drug_category: 'Cephalosporins', is_cia: true, volume: 4 },
    { livestock_id: 'C-1100', drug_name: 'Lincomycin', date: '2025-12-06', farmer_id: 'PRD-20251204-0156', farmer_name: 'Gopal Tripathi', farm_id: 'F-712', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Tripathi', vet_id: 'VET-20251201-0051', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '11 mL', route: 'Injection', amu_volume: '1,100 mg', amu_kg: 1.1, biomass_pcu: 450, diagnosis: 'Skin Infection', drug_category: 'Lincosamides', is_cia: false, volume: 11 },
    { livestock_id: 'P-7788', drug_name: 'Tilmicosin', date: '2025-12-07', farmer_id: 'PRD-20251205-0167', farmer_name: 'Hari Shukla', farm_id: 'F-823', livestock_type: 'Poultry', prescription: 'Yes', vet_name: 'Dr. Shukla', vet_id: 'VET-20251201-0054', state: 'Madhya Pradesh', district: 'Indore', dosage: '90 g', route: 'Oral (Water)', amu_volume: '9,000 mg', amu_kg: 9.0, biomass_pcu: 150, diagnosis: 'Airsacculitis', drug_category: 'Macrolides', is_cia: false, volume: 90 },
    { livestock_id: 'B-4433', drug_name: 'Spectinomycin', date: '2025-12-07', farmer_id: 'PRD-20251206-0178', farmer_name: 'Krishna Dwivedi', farm_id: 'F-934', livestock_type: 'Buffalo', prescription: 'No', vet_name: 'Dr. Dwivedi', vet_id: 'VET-20251201-0057', state: 'Madhya Pradesh', district: 'Sehore', dosage: '18 mL', route: 'Injection', amu_volume: '1,800 mg', amu_kg: 1.8, biomass_pcu: 500, diagnosis: 'Mastitis', drug_category: 'Aminoglycosides', is_cia: false, volume: 18 },
    { livestock_id: 'G-5522', drug_name: 'Sulfadiazine', date: '2025-12-08', farmer_id: 'PRD-20251207-0189', farmer_name: 'Rajendra Srivastava', farm_id: 'F-045', livestock_type: 'Goat', prescription: 'Yes', vet_name: 'Dr. Srivastava', vet_id: 'VET-20251201-0060', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '7 mL', route: 'Oral', amu_volume: '350 mg', amu_kg: 0.35, biomass_pcu: 40, diagnosis: 'Coccidiosis', drug_category: 'Sulfonamides', is_cia: false, volume: 7 },
    { livestock_id: 'C-6655', drug_name: 'Trimethoprim', date: '2025-12-08', farmer_id: 'PRD-20251208-0190', farmer_name: 'Mukesh Bharti', farm_id: 'F-156', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Bharti', vet_id: 'VET-20251201-0063', state: 'Madhya Pradesh', district: 'Indore', dosage: '13 mL', route: 'Injection', amu_volume: '1,300 mg', amu_kg: 1.3, biomass_pcu: 450, diagnosis: 'Bacterial Infection', drug_category: 'Diaminopyrimidines', is_cia: false, volume: 13 },
    { livestock_id: 'C-9921', drug_name: 'Chloramphenicol', date: '2025-12-03', farmer_id: 'PRD-20251119-0002', farmer_name: 'Ramesh Kumar', farm_id: 'F-102', livestock_type: 'Dairy Cow', prescription: 'No', vet_name: 'Dr. Sharma', vet_id: 'VET-20251201-0006', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '10 mL', route: 'Injection', amu_volume: '1,000 mg', amu_kg: 1.0, biomass_pcu: 450, diagnosis: 'Mastitis', drug_category: 'Amphenicols', is_cia: false, volume: 10 },
    { livestock_id: 'B-200', drug_name: 'Amoxicillin', date: '2025-12-04', farmer_id: 'PRD-20251120-0015', farmer_name: 'Suresh Patel', farm_id: 'F-305', livestock_type: 'Poultry', prescription: 'Yes', vet_name: 'Dr. Verma', vet_id: 'VET-20251201-0008', state: 'Madhya Pradesh', district: 'Indore', dosage: '70 g', route: 'Oral (Water)', amu_volume: '7,000 mg', amu_kg: 7.0, biomass_pcu: 150, diagnosis: 'Bacterial Infection', drug_category: 'Penicillins', is_cia: false, volume: 70 },
    { livestock_id: 'G-4412', drug_name: 'Polymyxin B', date: '2025-12-05', farmer_id: 'PRD-20251121-0023', farmer_name: 'Mohan Singh', farm_id: 'F-088', livestock_type: 'Goat', prescription: 'Yes', vet_name: 'Dr. Kumar', vet_id: 'VET-20251201-0012', state: 'Madhya Pradesh', district: 'Sehore', dosage: '5 mL', route: 'Injection', amu_volume: '250 mg', amu_kg: 0.25, biomass_pcu: 40, diagnosis: 'Wound Infection', drug_category: 'Polymyxins', is_cia: true, volume: 5 },
    { livestock_id: 'B-7721', drug_name: 'Azithromycin', date: '2025-12-06', farmer_id: 'PRD-20251122-0034', farmer_name: 'Prakash Sharma', farm_id: 'F-112', livestock_type: 'Buffalo', prescription: 'No', vet_name: 'Dr. Patel', vet_id: 'VET-20251201-0015', state: 'Madhya Pradesh', district: 'Bhopal', dosage: '12 mL', route: 'Injection', amu_volume: '1,200 mg', amu_kg: 1.2, biomass_pcu: 500, diagnosis: 'Respiratory Infection', drug_category: 'Macrolides', is_cia: false, volume: 12 },
    { livestock_id: 'C-8832', drug_name: 'Metronidazole', date: '2025-12-07', farmer_id: 'PRD-20251123-0045', farmer_name: 'Rajesh Mishra', farm_id: 'F-156', livestock_type: 'Dairy Cow', prescription: 'Yes', vet_name: 'Dr. Singh', vet_id: 'VET-20251201-0018', state: 'Madhya Pradesh', district: 'Indore', dosage: '15 mL', route: 'Injection', amu_volume: '1,500 mg', amu_kg: 1.5, biomass_pcu: 450, diagnosis: 'Anaerobic Infection', drug_category: 'Nitroimidazoles', is_cia: false, volume: 15 }
  ];

  // ---------- DROPDOWN OPTIONS ----------

  const stateOptions = useMemo(
    () => statesData.states.map((s) => s.state),
    []
  )

  const districtOptions = useMemo(() => {
    if (!selectedState) return []
    const stateObj = statesData.states.find((s) => s.state === selectedState)
    return stateObj ? stateObj.districts : []
  }, [selectedState])

  // ---------- FETCH DATA ----------

  const handleLoad = async () => {
    setError(null)

    if (!selectedState) {
      toast.error('Please select a state')
      return
    }
    if (!fromDate || !toDate) {
      toast.error('Please select both "From" and "To" dates')
      return
    }
    if (fromDate > toDate) {
      toast.error('"From date" cannot be after "To date"')
      return
    }

    setLoading(true)

    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('Applying filters:', { selectedState, selectedDistrict, fromDate, toDate })

      // Filter dummy data
      let filteredData = dummyAMUData

      // Filter by state (must be Madhya Pradesh)
      filteredData = filteredData.filter(item => item.state === selectedState)

      // Filter by district if selected
      if (selectedDistrict) {
        filteredData = filteredData.filter(item => item.district === selectedDistrict)
      }

      // Filter by date range
      filteredData = filteredData.filter(item => {
        const itemDate = item.date
        return itemDate >= fromDate && itemDate <= toDate
      })

      console.log(`Found ${filteredData.length} AMU records after filtering`)

      // Calculate statistics
      const totalVolume = filteredData.reduce((sum, item) => sum + item.volume, 0)
      
      // Find most used drug
      const drugCounts = {}
      filteredData.forEach(item => {
        if (!drugCounts[item.drug_name]) {
          drugCounts[item.drug_name] = { volume: 0, count: 0 }
        }
        drugCounts[item.drug_name].volume += item.volume
        drugCounts[item.drug_name].count += 1
      })

      let topDrug = { name: null, volume: 0, count: 0 }
      Object.keys(drugCounts).forEach(drugName => {
        if (drugCounts[drugName].count > topDrug.count) {
          topDrug = {
            name: drugName,
            volume: drugCounts[drugName].volume,
            count: drugCounts[drugName].count
          }
        }
      })

      // AMU Metrics Calculation
      const totalAMU_kg = filteredData.reduce((sum, item) => sum + (item.amu_kg || 0), 0)
      const totalBiomass = filteredData.reduce((sum, item) => sum + (item.biomass_pcu || 0), 0)
      const intensity = totalBiomass > 0 ? ((totalAMU_kg * 1000) / totalBiomass) : 0
      const ciaRecords = filteredData.filter(item => item.is_cia === true)
      const ciaPercent = filteredData.length > 0 ? ((ciaRecords.length / filteredData.length) * 100) : 0

      // Find top disease
      const diseaseMap = {}
      filteredData.forEach(item => {
        const diag = item.diagnosis || 'Unknown'
        diseaseMap[diag] = (diseaseMap[diag] || 0) + 1
      })
      let topDiseaseVal = { name: 'N/A', count: 0 }
      for (const [diagName, count] of Object.entries(diseaseMap)) {
        if (count > topDiseaseVal.count) {
          topDiseaseVal = { name: diagName, count }
        }
      }

      // Format enriched records for table
      const enriched = filteredData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-IN'),
        raw_date: item.date,
        state: item.state,
        district: item.district,
        farm_id: item.farm_id,
        livestock_type: item.livestock_type,
        livestock_id: item.livestock_id,
        vet_id: item.vet_id,
        vet_name: item.vet_name,
        drug_name: item.drug_name,
        route: item.route,
        dosage: item.dosage,
        amu_volume: item.amu_volume,
        diagnosis: item.diagnosis,
        amu_kg: item.amu_kg,
        biomass_pcu: item.biomass_pcu,
        drug_category: item.drug_category,
        is_cia: item.is_cia,
        farmer_name: item.farmer_name,
        farmer_id: item.farmer_id,
        location: `${item.district}, ${item.state}`,
        prescription: item.prescription,
        volume: item.volume,
        compliance: item.prescription === 'Yes' ? 'Compliant' : 'Non-Compliant'
      }))

      setRecords(filteredData)
      setEnrichedAMURecords(enriched)
      setTotalAmuVolume(totalVolume)
      setMostUsedDrug(topDrug)
      setTotalAMUkg(totalAMU_kg)
      setTotalBiomassPCU(totalBiomass)
      setUsageIntensity(intensity)
      setCiaPercentage(ciaPercent)
      setTopDisease(topDiseaseVal.name)
      setDataLoaded(true)
      toast.success(`Loaded ${filteredData.length} AMU records`)

    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message)
      toast.error('Failed to load AMU records')
    } finally {
      setLoading(false)
    }
  }

  // ---------- SORTED RECORDS ----------

  const sortedRecords = useMemo(() => {
    const arr = [...enrichedAMURecords]

    arr.sort((a, b) => {
      let av = a[sortField]
      let bv = b[sortField]

      if (sortField === 'administration_date') {
        const da = av ? new Date(av).getTime() : 0
        const db = bv ? new Date(bv).getTime() : 0
        return sortDirection === 'asc' ? da - db : db - da
      }

      if (sortField === 'amu_volume') {
        const na = av != null ? parseFloat(av) : 0
        const nb = bv != null ? parseFloat(bv) : 0
        if (Number.isNaN(na) || Number.isNaN(nb)) return 0
        return sortDirection === 'asc' ? na - nb : nb - na
      }

      av = av || ''
      bv = bv || ''
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv)
        return sortDirection === 'asc' ? cmp : -cmp
      }

      return 0
    })

    return arr
  }, [enrichedAMURecords, sortField, sortDirection])

  // ---------- CSV DOWNLOAD HELPER ----------

  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      const headers = [
        'Date', 'Drug Name', 'Category', 'Dosage', 'Livestock ID',
        'Farm Name', 'Farmer Name', 'Farmer ID', 'Vet Name', 'Vet ID',
        'Prescription', 'Location', 'Compliance'
      ]

      const rows = data.map(record => [
        record.date || '—',
        record.drug_name || '—',
        record.category || '—',
        record.dosage || '—',
        record.livestock_id || '—',
        record.farm_name || '—',
        record.farmer_name || '—',
        record.farmer_id || '—',
        record.vet_name || '—',
        record.vet_id || '—',
        record.prescription || '—',
        record.location || '—',
        record.compliance || '—'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success('CSV downloaded successfully')
    } catch (err) {
      console.error('CSV export error:', err)
      toast.error('Failed to export CSV')
    }
  }

  // ---------- EXPORT PDF ----------

  const handleExportPdf = () => {
    if (!enrichedAMURecords.length) {
      toast.error('No data to export')
      return
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4') // Landscape for 12 columns
      
      // Header
      doc.setFontSize(18)
      doc.text('AMU Surveillance Report', 14, 22)
      
      // Metadata
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`State: ${selectedState}`, 14, 32)
      doc.text(`District: ${selectedDistrict || 'All'}`, 14, 38)
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 44)
      doc.text(`Total Records: ${enrichedAMURecords.length} | Total AMU: ${totalAMUkg.toFixed(2)} kg | Biomass: ${totalBiomassPCU.toFixed(0)} PCU | Usage Intensity: ${usageIntensity.toFixed(2)} mg/PCU`, 14, 50)

      // Table data
      const tableData = enrichedAMURecords.map(record => [
        record.date,
        record.state,
        record.district,
        record.farm_id,
        record.livestock_type,
        record.livestock_id,
        `${record.vet_id} (${record.vet_name})`,
        record.drug_name + (record.is_cia ? ' ⚠' : ''),
        record.route,
        record.dosage,
        record.amu_volume,
        record.diagnosis
      ])

      // Auto table
      autoTable(doc, {
        startY: 56,
        head: [['Date', 'State', 'District', 'Farm ID', 'Type', 'Livestock ID', 'Vet', 'Drug', 'Route', 'Dosage', 'AMU Vol', 'Diagnosis']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [79, 70, 229], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 22 },
          2: { cellWidth: 18 },
          3: { cellWidth: 15 },
          4: { cellWidth: 18 },
          5: { cellWidth: 18 },
          6: { cellWidth: 30 },
          7: { cellWidth: 25 },
          8: { cellWidth: 18 },
          9: { cellWidth: 15 },
          10: { cellWidth: 18 },
          11: { cellWidth: 25 }
        }
      })

      doc.save(`amu_surveillance_${fromDate}_${toDate}.pdf`)
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.error('Failed to generate PDF')
    }
  }

  // ---------- UI ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AMU Summary</h1>
          <p className="text-sm text-gray-600">
            Filter antimicrobial usage by state, district, and date range.
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          className="inline-flex items-center px-3 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60"
          disabled={!records.length}
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPinIcon className="w-5 h-5 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">
            Filters – State / District / Date
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">State *</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value)
                setSelectedDistrict('')
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select state...</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">District (optional)</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedState}
            >
              <option value="">All districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">From date *</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">To date *</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          {error && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {error}
            </p>
          )}
          <button
            onClick={handleLoad}
            className="inline-flex items-center px-4 py-2 ml-auto text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {/* AMU KPI Cards */}
      {dataLoaded && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Total AMU Volume (kg) */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-blue-700">Total AMU Volume</p>
            <p className="mt-2 text-2xl font-bold text-blue-900">
              {totalAMUkg.toFixed(2)} kg
            </p>
            <p className="mt-1 text-xs text-blue-600">{records.length} records</p>
          </div>

          {/* Total Biomass (PCU) */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-green-700">Total Biomass</p>
            <p className="mt-2 text-2xl font-bold text-green-900">
              {totalBiomassPCU.toFixed(0)} PCU
            </p>
            <p className="mt-1 text-xs text-green-600">Population Correction Unit</p>
          </div>

          {/* Usage Intensity */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-purple-700">Usage Intensity</p>
            <p className="mt-2 text-2xl font-bold text-purple-900">
              {usageIntensity.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-purple-600">mg/PCU</p>
          </div>

          {/* H-1/CIA Usage */}
          <div className={`p-4 bg-gradient-to-br border rounded-lg shadow-sm ${
            ciaPercentage > 20 ? 'from-red-50 to-red-100 border-red-200' : 'from-amber-50 to-amber-100 border-amber-200'
          }`}>
            <p className={`text-xs font-medium ${ciaPercentage > 20 ? 'text-red-700' : 'text-amber-700'}`}>
              H-1/CIA Usage
            </p>
            <p className={`mt-2 text-2xl font-bold ${ciaPercentage > 20 ? 'text-red-900' : 'text-amber-900'}`}>
              {ciaPercentage.toFixed(1)}%
            </p>
            <p className={`mt-1 text-xs ${ciaPercentage > 20 ? 'text-red-600' : 'text-amber-600'}`}>
              {ciaPercentage > 20 ? '⚠ High CIA usage' : 'Critically Important'}
            </p>
          </div>

          {/* Top Disease Driver */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-indigo-700">Top Disease Driver</p>
            <p className="mt-2 text-lg font-bold text-indigo-900">
              {topDisease}
            </p>
            <p className="mt-1 text-xs text-indigo-600">Leading diagnosis</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AMU Treatment Records</h3>
            <p className="text-sm text-gray-600">Antimicrobial usage tracking with compliance status</p>
          </div>
          {dataLoaded && enrichedAMURecords.length > 0 && (
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Download PDF
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Date</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">State</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">District</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Farm ID</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Livestock Type</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Livestock ID</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Vet ID (Name)</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Drug Name</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Route</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Dosage</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">AMU Vol</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-500 uppercase">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRecords.length > 0 ? (
                sortedRecords.map((record, idx) => (
                  <tr key={`${record.livestock_id}-${idx}`} className="transition-colors hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs whitespace-nowrap">{record.date}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{record.state}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{record.district}</td>
                    <td className="px-3 py-3 font-mono text-xs text-indigo-600">{record.farm_id}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{record.livestock_type}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{record.livestock_id}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-gray-900">{record.vet_id}</div>
                      <div className="text-xs text-gray-500">({record.vet_name})</div>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">
                      {record.drug_name}
                      {record.is_cia && (
                        <span className="ml-1 text-xs text-red-600" title="Critically Important Antimicrobial">⚠</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{record.route}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{record.dosage}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{record.amu_volume}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{record.diagnosis}</td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>

          {sortedRecords.length === 0 && !loading && dataLoaded && (
            <div className="py-12 text-center">
              <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">No AMU records found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            </div>
          )}

          {!dataLoaded && !loading && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm">Select Madhya Pradesh state, date range, and click "Apply Filters"</p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-2 text-sm text-gray-500">Loading data...</p>
        </div>
      )}
    </div>
  )
}

export default RiskAnalytics
