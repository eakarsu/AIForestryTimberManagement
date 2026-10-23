import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import AIReport from '../components/AIReport';
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiSend, FiLoader } from 'react-icons/fi';

const featureConfig = {
  'tree-inventory': {
    endpoint: '/api/tree-inventory',
    columns: ['species', 'location', 'height_m', 'diameter_cm', 'age_years', 'health_status'],
    columnLabels: ['Species', 'Location', 'Height (m)', 'Diameter (cm)', 'Age (yrs)', 'Health'],
    fields: [
      { name: 'species', label: 'Species', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'latitude', label: 'Latitude', type: 'number', step: '0.000001' },
      { name: 'longitude', label: 'Longitude', type: 'number', step: '0.000001' },
      { name: 'height_m', label: 'Height (m)', type: 'number', step: '0.01' },
      { name: 'diameter_cm', label: 'Diameter (cm)', type: 'number', step: '0.01' },
      { name: 'age_years', label: 'Age (years)', type: 'number' },
      { name: 'health_status', label: 'Health Status', type: 'select', options: ['Excellent', 'Healthy', 'Good', 'Fair', 'Poor', 'Critical'] },
      { name: 'canopy_cover_pct', label: 'Canopy Cover %', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'health_status',
    statusColors: { Excellent: '#16a34a', Healthy: '#22c55e', Good: '#84cc16', Fair: '#eab308', Poor: '#f97316', Critical: '#dc2626' },
  },
  'harvest-plans': {
    endpoint: '/api/harvest-plans',
    columns: ['plan_name', 'species_target', 'volume_m3', 'method', 'scheduled_date', 'status'],
    columnLabels: ['Plan Name', 'Species', 'Volume (m³)', 'Method', 'Scheduled', 'Status'],
    fields: [
      { name: 'plan_name', label: 'Plan Name', type: 'text', required: true },
      { name: 'plot_id', label: 'Plot ID', type: 'number' },
      { name: 'species_target', label: 'Target Species', type: 'text' },
      { name: 'volume_m3', label: 'Volume (m³)', type: 'number', step: '0.01' },
      { name: 'method', label: 'Method', type: 'select', options: ['Selective Cutting', 'Thinning', 'Clearcut', 'Shelterwood', 'Seed Tree', 'Coppicing', 'Salvage Logging', 'Selection System', 'Single Tree Selection', 'Strip Cutting', 'Improvement Cutting', 'Rotation', 'Restoration Cutting'] },
      { name: 'scheduled_date', label: 'Scheduled Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Approved', 'In Progress', 'Completed', 'Cancelled'] },
      { name: 'sustainability_score', label: 'Sustainability Score', type: 'number' },
      { name: 'environmental_notes', label: 'Environmental Notes', type: 'textarea' },
    ],
    statusField: 'status',
    statusColors: { Planned: '#6366f1', Approved: '#16a34a', 'In Progress': '#eab308', Completed: '#0891b2', Cancelled: '#dc2626' },
  },
  'wildfire-assessments': {
    endpoint: '/api/wildfire-assessments',
    columns: ['zone_name', 'risk_level', 'vegetation_density', 'slope_degree', 'moisture_level', 'wind_exposure'],
    columnLabels: ['Zone', 'Risk Level', 'Vegetation', 'Slope (°)', 'Moisture', 'Wind'],
    fields: [
      { name: 'zone_name', label: 'Zone Name', type: 'text', required: true },
      { name: 'latitude', label: 'Latitude', type: 'number', step: '0.000001' },
      { name: 'longitude', label: 'Longitude', type: 'number', step: '0.000001' },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
      { name: 'vegetation_density', label: 'Vegetation Density', type: 'select', options: ['Sparse', 'Medium', 'Dense', 'Very Dense'] },
      { name: 'slope_degree', label: 'Slope (degrees)', type: 'number', step: '0.01' },
      { name: 'last_fire_date', label: 'Last Fire Date', type: 'date' },
      { name: 'moisture_level', label: 'Moisture Level', type: 'select', options: ['Very Low', 'Low', 'Medium', 'High', 'Very High'] },
      { name: 'wind_exposure', label: 'Wind Exposure', type: 'select', options: ['Low', 'Moderate', 'High', 'Very High'] },
      { name: 'mitigation_notes', label: 'Mitigation Notes', type: 'textarea' },
    ],
    statusField: 'risk_level',
    statusColors: { Low: '#16a34a', Moderate: '#eab308', High: '#f97316', Critical: '#dc2626' },
  },
  'carbon-credits': {
    endpoint: '/api/carbon-credits',
    columns: ['project_name', 'credits_earned', 'verification_status', 'methodology', 'vintage_year', 'buyer'],
    columnLabels: ['Project', 'Credits', 'Status', 'Method', 'Year', 'Buyer'],
    fields: [
      { name: 'project_name', label: 'Project Name', type: 'text', required: true },
      { name: 'plot_id', label: 'Plot ID', type: 'number' },
      { name: 'credits_earned', label: 'Credits Earned', type: 'number', step: '0.01' },
      { name: 'verification_status', label: 'Verification Status', type: 'select', options: ['Pending', 'Under Review', 'Verified', 'Rejected'] },
      { name: 'methodology', label: 'Methodology', type: 'select', options: ['VCS', 'Gold Standard', 'ACR', 'CAR', 'Plan Vivo'] },
      { name: 'vintage_year', label: 'Vintage Year', type: 'number' },
      { name: 'buyer', label: 'Buyer', type: 'text' },
      { name: 'price_per_credit', label: 'Price per Credit ($)', type: 'number', step: '0.01' },
      { name: 'registry', label: 'Registry', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'verification_status',
    statusColors: { Pending: '#eab308', 'Under Review': '#6366f1', Verified: '#16a34a', Rejected: '#dc2626' },
  },
  'forest-plots': {
    endpoint: '/api/forest-plots',
    columns: ['plot_name', 'region', 'area_hectares', 'dominant_species', 'ownership', 'certification_status'],
    columnLabels: ['Plot Name', 'Region', 'Area (ha)', 'Species', 'Ownership', 'Certification'],
    fields: [
      { name: 'plot_name', label: 'Plot Name', type: 'text', required: true },
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'area_hectares', label: 'Area (hectares)', type: 'number', step: '0.01' },
      { name: 'elevation_m', label: 'Elevation (m)', type: 'number' },
      { name: 'soil_type', label: 'Soil Type', type: 'text' },
      { name: 'dominant_species', label: 'Dominant Species', type: 'text' },
      { name: 'ownership', label: 'Ownership', type: 'select', options: ['Company', 'Private', 'Federal', 'State'] },
      { name: 'certification_status', label: 'Certification', type: 'select', options: ['FSC Certified', 'SFI Certified', 'PEFC Certified', 'Pending', 'Not Certified'] },
      { name: 'last_survey_date', label: 'Last Survey', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'certification_status',
    statusColors: { 'FSC Certified': '#16a34a', 'SFI Certified': '#0891b2', 'PEFC Certified': '#7c3aed', Pending: '#eab308', 'Not Certified': '#94a3b8' },
  },
  'equipment': {
    endpoint: '/api/equipment',
    columns: ['name', 'type', 'manufacturer', 'model_year', 'condition', 'hourly_rate'],
    columnLabels: ['Name', 'Type', 'Manufacturer', 'Year', 'Condition', 'Rate ($/hr)'],
    fields: [
      { name: 'name', label: 'Equipment Name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text' },
      { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { name: 'model_year', label: 'Model Year', type: 'number' },
      { name: 'condition', label: 'Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'] },
      { name: 'assigned_plot', label: 'Assigned Plot', type: 'text' },
      { name: 'last_maintenance', label: 'Last Maintenance', type: 'date' },
      { name: 'next_maintenance', label: 'Next Maintenance', type: 'date' },
      { name: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number', step: '0.01' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'condition',
    statusColors: { Excellent: '#16a34a', Good: '#84cc16', Fair: '#eab308', Poor: '#f97316', 'Out of Service': '#dc2626' },
  },
  'workers': {
    endpoint: '/api/workers',
    columns: ['first_name', 'last_name', 'role', 'certification', 'assigned_plot', 'hourly_wage'],
    columnLabels: ['First Name', 'Last Name', 'Role', 'Certification', 'Assigned Plot', 'Wage ($/hr)'],
    fields: [
      { name: 'first_name', label: 'First Name', type: 'text', required: true },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'certification', label: 'Certification', type: 'text' },
      { name: 'hire_date', label: 'Hire Date', type: 'date' },
      { name: 'hourly_wage', label: 'Hourly Wage ($)', type: 'number', step: '0.01' },
      { name: 'assigned_plot', label: 'Assigned Plot', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'emergency_contact', label: 'Emergency Contact', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'disease-reports': {
    endpoint: '/api/disease-reports',
    columns: ['tree_species', 'disease_name', 'severity', 'location', 'treatment_status', 'detection_date'],
    columnLabels: ['Species', 'Disease', 'Severity', 'Location', 'Treatment', 'Detected'],
    fields: [
      { name: 'tree_species', label: 'Tree Species', type: 'text', required: true },
      { name: 'disease_name', label: 'Disease Name', type: 'text', required: true },
      { name: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
      { name: 'affected_area_hectares', label: 'Affected Area (ha)', type: 'number', step: '0.01' },
      { name: 'symptoms', label: 'Symptoms', type: 'textarea' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'detection_date', label: 'Detection Date', type: 'date' },
      { name: 'treatment_status', label: 'Treatment Status', type: 'select', options: ['Monitoring', 'Under Treatment', 'Active Response', 'Resolved'] },
      { name: 'treatment_method', label: 'Treatment Method', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'severity',
    statusColors: { Low: '#16a34a', Moderate: '#eab308', High: '#f97316', Critical: '#dc2626' },
  },
  'timber-sales': {
    endpoint: '/api/timber-sales',
    columns: ['buyer_name', 'species', 'volume_m3', 'grade', 'total_value', 'payment_status'],
    columnLabels: ['Buyer', 'Species', 'Volume (m³)', 'Grade', 'Total Value', 'Payment'],
    fields: [
      { name: 'buyer_name', label: 'Buyer Name', type: 'text', required: true },
      { name: 'species', label: 'Species', type: 'text' },
      { name: 'volume_m3', label: 'Volume (m³)', type: 'number', step: '0.01' },
      { name: 'grade', label: 'Grade', type: 'select', options: ['Ultra Premium', 'Premium', 'Select', 'Standard', 'Utility', 'Pulpwood'] },
      { name: 'price_per_m3', label: 'Price per m³ ($)', type: 'number', step: '0.01' },
      { name: 'total_value', label: 'Total Value ($)', type: 'number', step: '0.01' },
      { name: 'sale_date', label: 'Sale Date', type: 'date' },
      { name: 'delivery_date', label: 'Delivery Date', type: 'date' },
      { name: 'payment_status', label: 'Payment Status', type: 'select', options: ['Pending', 'Invoiced', 'Paid', 'Overdue'] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'payment_status',
    statusColors: { Pending: '#eab308', Invoiced: '#6366f1', Paid: '#16a34a', Overdue: '#dc2626' },
  },
  'compliance-reports': {
    endpoint: '/api/compliance-reports',
    columns: ['report_name', 'regulation', 'audit_date', 'auditor', 'status'],
    columnLabels: ['Report', 'Regulation', 'Audit Date', 'Auditor', 'Status'],
    fields: [
      { name: 'report_name', label: 'Report Name', type: 'text', required: true },
      { name: 'regulation', label: 'Regulation', type: 'text' },
      { name: 'audit_date', label: 'Audit Date', type: 'date' },
      { name: 'auditor', label: 'Auditor', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['Passed', 'Passed with Conditions', 'Failed', 'Approved', 'Active', 'Verified', 'Cleared', 'Pending'] },
      { name: 'findings', label: 'Findings', type: 'textarea' },
      { name: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' },
      { name: 'next_audit_date', label: 'Next Audit Date', type: 'date' },
      { name: 'plot_id', label: 'Plot ID', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    statusField: 'status',
    statusColors: { Passed: '#16a34a', 'Passed with Conditions': '#eab308', Failed: '#dc2626', Approved: '#0891b2', Active: '#6366f1', Verified: '#16a34a', Cleared: '#84cc16', Pending: '#94a3b8' },
  },
  'safety-incidents': {
    endpoint: '/api/safety-incidents',
    columns: ['incident_type', 'severity', 'plot_id', 'worker_id', 'near_miss', 'occurred_at'],
    columnLabels: ['Type', 'Severity', 'Plot', 'Worker', 'Near Miss', 'When'],
    fields: [
      { name: 'incident_type', label: 'Incident Type', type: 'text', required: true },
      { name: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'plot_id', label: 'Plot ID', type: 'number' },
      { name: 'worker_id', label: 'Worker ID', type: 'number' },
      { name: 'near_miss', label: 'Near Miss?', type: 'select', options: ['true', 'false'] },
      { name: 'root_cause', label: 'Root Cause (if known)', type: 'textarea' },
    ],
    statusField: 'severity',
    statusColors: { Low: '#16a34a', Moderate: '#eab308', High: '#f97316', Critical: '#dc2626' },
  },
  'market-prices': {
    endpoint: '/api/market-prices',
    columns: ['species', 'grade', 'price_per_m3', 'region', 'recorded_at'],
    columnLabels: ['Species', 'Grade', 'Price/m³', 'Region', 'Recorded'],
    fields: [
      { name: 'species', label: 'Species', type: 'text', required: true },
      { name: 'grade', label: 'Grade', type: 'select', options: ['Ultra Premium', 'Premium', 'Select', 'Standard', 'Utility', 'Pulpwood'] },
      { name: 'price_per_m3', label: 'Price per m³ ($)', type: 'number', step: '0.01' },
      { name: 'region', label: 'Region', type: 'text' },
    ],
  },
  'ai-results': {
    endpoint: '/api/ai-results',
    columns: ['analysis_type', 'entity_type', 'entity_id', 'model', 'created_at'],
    columnLabels: ['Type', 'Entity', 'Entity ID', 'Model', 'Created'],
    fields: [],
  },
};

const aiConfig = {
  'ai-species': {
    endpoint: '/api/ai/species-identification',
    title: 'AI Species Identification',
    description: 'Describe a tree (bark texture, leaf shape, size, location, etc.) and our AI will identify the species and provide detailed information.',
    inputLabel: 'Tree Description',
    inputPlaceholder: 'Describe the tree you want to identify. Include details about bark, leaves, flowers, fruit, size, location, and any distinctive features...',
    fieldName: 'description',
  },
  'ai-harvest': {
    endpoint: '/api/ai/harvest-optimization',
    title: 'AI Harvest Optimization',
    description: 'Provide plot data and the AI will generate an optimized sustainable harvest plan with environmental considerations.',
    inputLabel: 'Plot Data for Optimization',
    inputPlaceholder: 'Enter plot details: species mix, area (hectares), tree ages, density, soil type, slope, access roads, nearby waterways, current season, certification requirements...',
    fieldName: 'plotData',
  },
  'ai-wildfire': {
    endpoint: '/api/ai/wildfire-risk',
    title: 'AI Wildfire Risk Analysis',
    description: 'Provide zone data and the AI will assess wildfire risk with detailed mitigation recommendations.',
    inputLabel: 'Zone Data for Risk Assessment',
    inputPlaceholder: 'Enter zone details: vegetation type and density, slope degree, aspect, recent rainfall, temperature, humidity, wind patterns, fuel load, distance to structures, access routes...',
    fieldName: 'zoneData',
  },
  'ai-carbon': {
    endpoint: '/api/ai/carbon-estimation',
    title: 'AI Carbon Credit Estimation',
    description: 'Provide forest data and the AI will estimate carbon sequestration potential and credit value.',
    inputLabel: 'Forest Data for Carbon Estimation',
    inputPlaceholder: 'Enter forest details: species composition, area (hectares), average tree age, canopy density, soil type, annual rainfall, growth rate, management practices, baseline land use...',
    fieldName: 'forestData',
  },
  'ai-disease': {
    endpoint: '/api/ai/disease-analysis',
    title: 'AI Disease Detection',
    description: 'Describe tree symptoms and the AI will diagnose potential diseases with treatment recommendations.',
    inputLabel: 'Symptom Description',
    inputPlaceholder: 'Describe the symptoms: affected tree species, leaf discoloration, bark abnormalities, growth patterns, presence of fungi/insects, timing of onset, spread pattern, affected area size...',
    fieldName: 'symptoms',
  },
  'ai-growth': {
    endpoint: '/api/ai/growth-prediction',
    title: 'AI Growth Prediction',
    description: 'Provide tree data and the AI will predict growth patterns and recommend optimal management.',
    inputLabel: 'Tree Data for Growth Prediction',
    inputPlaceholder: 'Enter tree details: species, current height, DBH, age, site index, stand density, soil type, elevation, annual precipitation, competing vegetation, past management history...',
    fieldName: 'treeData',
  },
};

const aiExamples = {
  'ai-species': [
    'Example observation: mature deciduous tree in a northeastern mixed forest; opposite branching, broad five-lobed leaves, gray ridged bark, and paired winged seeds. Explain likely species and distinguishing checks.',
    'Example observation: evergreen on a cool upland slope; flat needles arranged in two rows, small upright cones, and smooth gray bark with resin blisters. Compare likely species and evidence needed.',
    'Example observation: young riparian tree with alternate serrated leaves, pale peeling bark, and drooping catkins. List possible species, uncertainty, and field identification steps.',
  ],
  'ai-harvest': [
    'Example stand: 42 hectares of mixed oak and maple, ages 55–80 years, moderate density, loam soil, 12% slope, one existing road and a seasonal stream. Prepare a selective harvest plan with buffers and regeneration checks.',
    'Example stand: 28 hectares of planted pine, age 32 years, high stocking, sandy soil, 6% slope and two road access points. Evaluate a thinning plan, equipment access and residual stand protection.',
    'Example stand: 65 hectares of mixed conifer, ages 70–100 years, steep western slope, wetland edge and limited road access. Compare low-impact harvest options and certification constraints.',
  ],
  'ai-wildfire': [
    'Example zone: dense pine understory on a 20-degree south-facing slope; seven dry days, 29°C, 28% humidity, 18 mph wind, and homes 800 m away. Assess risk and immediate mitigation.',
    'Example zone: mixed hardwood stand with moderate leaf litter on a 5-degree north slope; recent 18 mm rain, 22°C, 55% humidity, 8 mph wind, and one access road. Assess risk and monitoring needs.',
    'Example zone: grass and scrub at a forest edge, heavy cured fuel, 12-degree slope; 33°C, 20% humidity, 24 mph wind, and a maintenance facility 300 m away. Prioritize protective actions.',
  ],
  'ai-carbon': [
    'Example forest: 35 hectares of 40-year mixed pine and oak, 72% canopy cover, loam soil, 980 mm annual rainfall, no recent clearing, and selective thinning every 12 years. Estimate with explicit assumptions.',
    'Example forest: 20 hectares of newly planted native hardwood on former pasture, age 8 years, 58% canopy cover, clay loam, 1100 mm rainfall and annual survival checks. Explain baseline and uncertainty.',
    'Example forest: 80 hectares of mature spruce and fir, average age 75 years, 84% canopy cover, acidic soil, 1200 mm rainfall and conservation management. Compare sequestration scenarios.',
  ],
  'ai-disease': [
    'Example symptoms: red maple leaves show scattered brown margins and early drop in late summer; 12 of 40 trees affected after a dry month. No laboratory result. List plausible causes and diagnostic checks.',
    'Example symptoms: young pines have needle yellowing and resin on lower branches; clustered near wet ground, first noticed three weeks ago. No confirmed pathogen. Prioritize field inspection.',
    'Example symptoms: oak branches show localized dieback and dark bark lesions; six trees affected across two blocks over one season. Explain differential causes and safe sampling steps.',
  ],
  'ai-growth': [
    'Example stand: red oak, age 30 years, average height 15 m, DBH 22 cm, moderate density, loam soil, 250 m elevation, 1050 mm annual rain, no thinning history. Forecast with uncertainty.',
    'Example stand: loblolly pine, age 18 years, average height 17 m, DBH 20 cm, high density, sandy loam, 120 m elevation, 1250 mm annual rain and thinning planned. Compare scenarios.',
    'Example stand: mixed spruce and fir, age 55 years, average height 19 m, DBH 28 cm, cool upland site, shallow soil, 900 mm annual rain, and competing understory. Identify growth limits.',
  ],
};

export default function FeaturePage({ token, feature, title, isAI }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const config = isAI ? aiConfig[feature] : featureConfig[feature];
  const headers = { Authorization: `Bearer ${token}` };

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = useCallback(async () => {
    if (isAI) { setLoading(false); return; }
    try {
      const res = await axios.get(`${config.endpoint}?page=${page}&limit=20`, { headers });
      // Support both paginated and legacy array responses
      if (res.data && Array.isArray(res.data.data)) {
        setItems(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } else if (Array.isArray(res.data)) {
        setItems(res.data);
        setTotalPages(1);
      } else {
        setItems([]);
        setTotalPages(1);
        console.error('Record endpoint returned an unexpected response shape', config.endpoint);
      }
    } catch (err) { setItems([]); console.error(err); }
    setLoading(false);
  }, [feature, page]);

  useEffect(() => {
    setSelectedItem(null);
    setShowForm(false);
    setAiResult(null);
    setAiInput('');
    setLoading(true);
    fetchItems();
  }, [feature]);

  useEffect(() => {
    if (page !== 1) { setLoading(true); fetchItems(); }
  }, [page, fetchItems]);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({});
    setShowForm(true);
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item });
    setShowForm(true);
    setSelectedItem(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${config.endpoint}/${id}`, { headers });
      setSelectedItem(null);
      fetchItems();
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await axios.put(`${config.endpoint}/${editItem.id}`, formData, { headers });
      } else {
        await axios.post(config.endpoint, formData, { headers });
      }
      setShowForm(false);
      setFormData({});
      setEditItem(null);
      fetchItems();
    } catch (err) { console.error(err); }
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const body = {};
      body[config.fieldName] = aiInput;
      const res = await axios.post(config.endpoint, body, { headers });
      setAiResult(res.data);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || err.message });
    }
    setAiLoading(false);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (val === '') return 'Empty string';
    if (typeof val === 'number') return val.toLocaleString();
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(val).toLocaleDateString();
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  if (isAI) {
    return (
      <div className="feature-page">
        <div className="page-header">
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="ai-container">
          <div className="ai-input-section">
            <div className="ai-preset-bar"><strong>Example scenarios</strong><div className="ai-actions">{(aiExamples[feature] || []).map((example, index) => <button key={index} type="button" className="btn btn-secondary" disabled={aiLoading} onClick={() => setAiInput(example)}>Fill {['field review', 'planning case', 'detailed scenario'][index]}</button>)}</div></div>
            <label>{config.inputLabel}</label>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder={config.inputPlaceholder}
              rows={6}
            />
            <button
              className="ai-submit-btn"
              onClick={handleAiSubmit}
              disabled={aiLoading || !aiInput.trim()}
            >
              {aiLoading ? (
                <><FiLoader className="spin" /> Analyzing...</>
              ) : (
                <><FiSend /> Analyze with AI</>
              )}
            </button>
          </div>
          {aiResult && (
            <div className="ai-result">
              {aiResult.error ? (
                <div className="ai-error">
                  <h3>Error</h3>
                  <p>{aiResult.error}</p>
                </div>
              ) : (
                <div className="ai-analysis">
                  <div className="ai-result-header">
                    <h3>AI Analysis Result</h3>
                    <span className="ai-timestamp">
                      {new Date(aiResult.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <AIReport response={aiResult.parsed || aiResult.analysis || aiResult} title={config.title} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="feature-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="feature-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setShowForm(false)}>
            <FiArrowLeft /> Back
          </button>
          <h1>{editItem ? 'Edit' : 'New'} {title}</h1>
        </div>
        <form className="detail-form" onSubmit={handleSubmit}>
          {config.fields.map(field => (
            <div key={field.name} className="form-group">
              <label>{field.label}{field.required && ' *'}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  rows={3}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  step={field.step}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="save-btn">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <h1>{title}</h1>
        <button className="add-btn" onClick={handleCreate}>
          <FiPlus /> New Item
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {config.columnLabels.map((label, i) => (
                <th key={i}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                {config.columns.map((col, i) => (
                  <td key={i}>
                    {config.statusField === col ? (
                      <span className="status-badge" style={{ background: config.statusColors?.[item[col]] || '#94a3b8' }}>
                        {item[col]}
                      </span>
                    ) : formatValue(item[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
      {selectedItem && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedItem(null)}>
          <div className="detail-card" role="dialog" aria-modal="true" style={{ background: '#1e293b', borderRadius: 16, padding: 24, width: '90%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{title} Details</h2>
            </div>
            <div>
              {Object.entries(selectedItem).filter(([key]) => key !== 'id').map(([key, value]) => (
                <div key={key} className="detail-row">
                  <span className="detail-label">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <span className="detail-value">
                    {config.statusField === key ? (
                      <span className="status-badge" style={{ background: config.statusColors?.[value] || '#94a3b8' }}>
                        {value}
                      </span>
                    ) : feature === 'ai-results' && (typeof value === 'object' || (typeof value === 'string' && /^[\s]*[\[{]/.test(value))) ? (
                      <AIReport response={value} title={key.replace(/_/g, ' ')} />
                    ) : formatValue(value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="edit-btn" onClick={() => handleEdit(selectedItem)}>
                <FiEdit2 /> Edit
              </button>
              <button className="delete-btn" onClick={() => handleDelete(selectedItem.id)}>
                <FiTrash2 /> Delete
              </button>
              <button className="cancel-btn" onClick={() => setSelectedItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
