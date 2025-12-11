import React, { useState, useEffect } from 'react';


const Clients = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    type: '',
    status: 'lead',
    address: '',
    city: '',
    state: '',
    zip: '',
    tags: '',
    notes: ''
  });

  // Load clients
  useEffect(() => {
    loadClients();
  }, []);

  // Filter and sort
  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, typeFilter, statusFilter, sortBy]);

  const loadClients = () => {
    const savedClients = localStorage.getItem('landscaping_clients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }
  };

  const saveClients = (updatedClients) => {
    setClients(updatedClients);
    localStorage.setItem('landscaping_clients', JSON.stringify(updatedClients));
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(client => client.type === typeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      case 'value':
        filtered.sort((a, b) => calculateClientValue(b.id) - calculateClientValue(a.id));
        break;
      default:
        break;
    }

    setFilteredClients(filtered);
  };

  const calculateClientValue = (clientId) => {
    const quotes = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
    const clientQuotes = quotes.filter(q => q.clientId === clientId);
    return clientQuotes.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      type: '',
      status: 'lead',
      address: '',
      city: '',
      state: '',
      zip: '',
      tags: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      type: client.type || '',
      status: client.status || 'lead',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || '',
      tags: client.tags || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setShowDetails(true);
  };

  const handleSaveClient = (e) => {
    e.preventDefault();
    
    if (selectedClient) {
      const updatedClients = clients.map(c =>
        c.id === selectedClient.id ? { ...formData, id: selectedClient.id, dateAdded: selectedClient.dateAdded } : c
      );
      saveClients(updatedClients);
    } else {
      const newClient = {
        ...formData,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString()
      };
      saveClients([...clients, newClient]);
    }
    
    setShowModal(false);
    setSelectedClient(null);
  };

  const handleDeleteClient = (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      const updatedClients = clients.filter(c => c.id !== clientId);
      saveClients(updatedClients);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getStats = () => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const leads = clients.filter(c => c.status === 'lead').length;
    
    let totalRevenue = 0;
    clients.forEach(client => {
      totalRevenue += calculateClientValue(client.id);
    });

    return { totalClients, activeClients, leads, totalRevenue };
  };

  const stats = getStats();

  // Client Card Component
  const ClientCard = ({ client }) => {
    const tags = client.tags ? client.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const quotes = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
    const appointments = JSON.parse(localStorage.getItem('landscaping_appointments') || '[]');
    const clientQuotes = quotes.filter(q => q.clientId === client.id);
    const clientAppointments = appointments.filter(a => a.clientId === client.id);
    const totalValue = calculateClientValue(client.id);

    return (
      <div className="client-card" onClick={() => handleViewClient(client)}>
        <div className="client-header">
          <div className="client-name">{client.name}</div>
          <div className="client-type">
            {client.type.charAt(0).toUpperCase() + client.type.slice(1)} Client
          </div>
        </div>
        
        <div className="client-body">
          <div className="client-info">
            <div className="info-row">
              <span className="icon">📧</span>
              <span>{client.email}</span>
            </div>
            <div className="info-row">
              <span className="icon">📱</span>
              <span>{client.phone}</span>
            </div>
            {client.address && (
              <div className="info-row">
                <span className="icon">📍</span>
                <span>{client.address}</span>
              </div>
            )}
            {client.company && (
              <div className="info-row">
                <span className="icon">🏢</span>
                <span>{client.company}</span>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="tags">
              {tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="client-stats">
            <div className="client-stat">
              <div className="client-stat-value">{clientQuotes.length}</div>
              <div className="client-stat-label">Estimates</div>
            </div>
            <div className="client-stat">
              <div className="client-stat-value">{clientAppointments.length}</div>
              <div className="client-stat-label">Appointments</div>
            </div>
            <div className="client-stat">
              <div className="client-stat-value">${totalValue.toFixed(0)}</div>
              <div className="client-stat-label">Total Value</div>
            </div>
          </div>

          <div className="client-actions">
            <button className="action-btn view" onClick={(e) => { e.stopPropagation(); handleViewClient(client); }}>
              👁️ View
            </button>
            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}>
              ✏️ Edit
            </button>
            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}>
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Stats Section */}
      <div className="clients-stats-section">
        <div className="stat-card">
          <div className="stat-value">{stats.totalClients}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeClients}</div>
          <div className="stat-label">Active Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.leads}</div>
          <div className="stat-label">Leads</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="clients-search-bar">
        <input
          type="text"
          placeholder="Search clients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="clients-filter-group">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="lead">Lead</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date Added</option>
            <option value="value">Sort by Total Value</option>
          </select>
          <button className="vd-btn vd-btn-primary" onClick={handleAddClient}>
            + Add New Client
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="clients-grid">
        {filteredClients.length === 0 ? (
          <div className="vd-empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No Clients Found</h3>
            <p>Try adjusting your search or filters, or add your first client.</p>
            <button className="vd-btn vd-btn-primary" onClick={handleAddClient}>
              + Add Your First Client
            </button>
          </div>
        ) : (
          filteredClients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSaveClient}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company">Company</label>
                    <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone *</label>
                    <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="type">Client Type *</label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange} required>
                      <option value="">Select Type</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Status *</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} required>
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="address">Address</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State</label>
                    <input type="text" id="state" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zip">ZIP Code</label>
                    <input type="text" id="zip" name="zip" value={formData.zip} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tags">Tags (comma-separated)</label>
                    <input type="text" id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="VIP, Regular, High-Value" />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows="4" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="vd-btn vd-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="vd-btn vd-btn-primary">Save Client</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedClient && (
        <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowDetails(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedClient.name}</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="details-section">
                <h3>📋 Contact Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Email</div>
                    <div className="detail-value">{selectedClient.email}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Phone</div>
                    <div className="detail-value">{selectedClient.phone}</div>
                  </div>
                  {selectedClient.company && (
                    <div className="detail-item">
                      <div className="detail-label">Company</div>
                      <div className="detail-value">{selectedClient.company}</div>
                    </div>
                  )}
                  <div className="detail-item">
                    <div className="detail-label">Client Type</div>
                    <div className="detail-value">{selectedClient.type.charAt(0).toUpperCase() + selectedClient.type.slice(1)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Status</div>
                    <div className="detail-value">{selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1)}</div>
                  </div>
                  {selectedClient.address && (
                    <div className="detail-item full-width">
                      <div className="detail-label">Address</div>
                      <div className="detail-value">
                        {selectedClient.address}
                        {selectedClient.city && `, ${selectedClient.city}`}
                        {selectedClient.state && `, ${selectedClient.state}`}
                        {selectedClient.zip && ` ${selectedClient.zip}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedClient.notes && (
                <div className="details-section">
                  <h3>📝 Notes</h3>
                  <div className="note-item">
                    <div className="note-content">{selectedClient.notes}</div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button className="vd-btn vd-btn-secondary" onClick={() => setShowDetails(false)}>Close</button>
                <button className="vd-btn vd-btn-primary" onClick={() => { setShowDetails(false); handleEditClient(selectedClient); }}>Edit Client</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Clients;