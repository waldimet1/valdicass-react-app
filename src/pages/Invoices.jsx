import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Invoices.css";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const navigate = useNavigate();

  // Load invoices from localStorage
  useEffect(() => {
    loadInvoices();
  }, []);

  // Filter and sort invoices
  useEffect(() => {
    filterAndSortInvoices();
  }, [invoices, searchTerm, statusFilter, sortBy]);

  const loadInvoices = () => {
    const savedInvoices = localStorage.getItem('landscaping_invoices');
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    }
  };

  const saveInvoices = (updatedInvoices) => {
    setInvoices(updatedInvoices);
    localStorage.setItem('landscaping_invoices', JSON.stringify(updatedInvoices));
  };

  const filterAndSortInvoices = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.poNumber && invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'dueDate':
        filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'amount':
        filtered.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
        break;
      case 'client':
        filtered.sort((a, b) => a.clientName.localeCompare(b.clientName));
        break;
      default:
        break;
    }

    setFilteredInvoices(filtered);
  };

  const getStats = () => {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid') return false;
      const dueDate = new Date(i.dueDate);
      return dueDate < new Date();
    }).length;

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

    const pendingAmount = invoices
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue,
      pendingAmount
    };
  };

  const handleCreateInvoice = () => {
    navigate('/invoice/new');
  };

  const handleViewInvoice = (id) => {
    navigate(`/invoice/${id}`);
  };

  const handleEditInvoice = (id) => {
    navigate(`/invoice/edit/${id}`);
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      const updatedInvoices = invoices.filter(i => i.id !== id);
      saveInvoices(updatedInvoices);
    }
  };

  const handleMarkAsPaid = (id) => {
    const updatedInvoices = invoices.map(i =>
      i.id === id ? { ...i, status: 'paid', paidDate: new Date().toISOString() } : i
    );
    saveInvoices(updatedInvoices);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (invoice) => {
    if (invoice.status === 'paid') {
      return { text: 'PAID', color: '#28a745' };
    }
    if (invoice.status === 'cancelled') {
      return { text: 'CANCELLED', color: '#6c757d' };
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    
    if (dueDate < today) {
      return { text: 'OVERDUE', color: '#dc3545' };
    }
    
    return { text: 'PENDING', color: '#ffc107' };
  };

  const getDaysOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const stats = getStats();

  // Group invoices by month
  const groupedInvoices = filteredInvoices.reduce((groups, invoice) => {
    const date = new Date(invoice.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(invoice);
    return groups;
  }, {});

  return (
    <>
      {/* Stats Section */}
      <div className="invoices-stats-section">
        <div className="stat-card">
          <div className="stat-value">{stats.totalInvoices}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.paidInvoices}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingInvoices}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overdueInvoices}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(stats.pendingAmount)}</div>
          <div className="stat-label">Pending Amount</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="invoices-search-bar">
        <input
          type="text"
          placeholder="Search by client name, invoice #, or PO #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="invoices-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="client">Sort by Client</option>
          </select>
          <button className="vd-btn vd-btn-primary" onClick={handleCreateInvoice}>
            + New Invoice
          </button>
        </div>
      </div>

      {/* Invoices List */}
      {Object.keys(groupedInvoices).length === 0 ? (
        <div className="vd-empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No Invoices Found</h3>
          <p>Create your first invoice to get started.</p>
          <button className="vd-btn vd-btn-primary" onClick={handleCreateInvoice}>
            + Create Your First Invoice
          </button>
        </div>
      ) : (
        Object.entries(groupedInvoices).map(([monthYear, monthInvoices]) => {
          const monthTotal = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
          
          return (
            <div className="vd-month-section" key={monthYear}>
              <div className="vd-month-header">
                <h2>{monthYear}</h2>
                <div className="vd-month-total">Total: {formatCurrency(monthTotal)}</div>
              </div>

              {monthInvoices.map(invoice => {
                const statusBadge = getStatusBadge(invoice);
                const isOverdue = statusBadge.text === 'OVERDUE';
                const daysOverdue = isOverdue ? getDaysOverdue(invoice.dueDate) : 0;

                return (
                  <div className="invoice-card" key={invoice.id}>
                    <div className="invoice-header">
                      <div className="invoice-title">
                        <strong>{invoice.clientName}</strong> - #{invoice.invoiceNumber}
                      </div>
                      <div className="invoice-amount">{formatCurrency(invoice.total)}</div>
                    </div>

                    <div className="invoice-body">
                      <div className="invoice-left">
                        <div className="invoice-date">
                          <strong>Issued:</strong> {formatDate(invoice.date)}
                        </div>
                        <div className="invoice-date">
                          <strong>Due:</strong> {formatDate(invoice.dueDate)}
                          {isOverdue && (
                            <span className="overdue-badge">
                              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </span>
                          )}
                        </div>
                        <div
                          className="invoice-status"
                          style={{ background: statusBadge.color }}
                        >
                          {statusBadge.text}
                        </div>
                      </div>

                      <div className="invoice-center">
                        {invoice.description && (
                          <div className="invoice-description">{invoice.description}</div>
                        )}
                        {invoice.poNumber && (
                          <div className="invoice-po">PO #: {invoice.poNumber}</div>
                        )}
                      </div>

                      <div className="invoice-right">
                        <div className="invoice-actions">
                          <button 
                            className="vd-btn-outline" 
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            👁️ View
                          </button>
                          {invoice.status !== 'paid' && (
                            <button 
                              className="vd-btn-success" 
                              onClick={() => handleMarkAsPaid(invoice.id)}
                            >
                              ✓ Mark Paid
                            </button>
                          )}
                          <button 
                            className="vd-btn-secondary" 
                            onClick={() => handleEditInvoice(invoice.id)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="vd-btn-danger" 
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </>
  );
};

export default Invoices;