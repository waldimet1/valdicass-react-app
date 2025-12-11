import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import '../styles/Templates.css';

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [user, setUser] = useState(null);

  const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    // Load default template + user templates
    const savedTemplates = localStorage.getItem('estimate_templates');
    const userTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    
    // Default Valdicass template
    const defaultTemplate = {
      id: 'default-valdicass-window',
      name: 'Valdicass Window Installation',
      description: 'Standard window installation contract with Pella products',
      category: 'Windows & Doors',
      isDefault: true,
      createdBy: 'system',
      lineItems: [
        {
          id: '1',
          description: 'Install Pella Lifestyle, Sash Set Fixed (bedroom)',
          quantity: 1,
          rate: 750.00,
          total: 750.00
        },
        {
          id: '2',
          description: 'Install Pella Lifestyle, Traditional Double Hung (dining)',
          quantity: 3,
          rate: 950.00,
          total: 2850.00
        },
        {
          id: '3',
          description: 'Install Pella Lifestyle, Double Hung (bedroom, stairs)',
          quantity: 2,
          rate: 950.00,
          total: 1900.00
        },
        {
          id: '4',
          description: 'Total Labor',
          quantity: 6,
          rate: 0,
          total: 5500.00
        },
        {
          id: '5',
          description: 'Valdicass Promo 50% OFF LABOR',
          quantity: 6,
          rate: 0,
          total: -2750.00
        },
        {
          id: '6',
          description: 'Pella Products Cost',
          quantity: 6,
          rate: 0,
          total: 11554.23
        },
        {
          id: '7',
          description: 'If Permits are needed, we will get them only if the customer agrees to pay for the fees that are given by the village.',
          quantity: 1,
          rate: 0,
          total: 0,
          notes: 'TBD based on village requirements'
        },
        {
          id: '8',
          description: 'Delivery and Disposal Included',
          quantity: 1,
          rate: 0,
          total: 0
        }
      ],
      notes: 'Workman\'s Compensation and Liability Insurance fully covers our Company and workers.\n\nA 5-year labor warranty covers all the work. Balance due on the day of job completion.\n\nLate payments over 30 days are subject to an 18% late charge.\n\nThank you for your business!',
      total: 14304.23
    };

    setTemplates([defaultTemplate, ...userTemplates]);
  };

  const saveTemplates = (updatedTemplates) => {
    // Filter out default template before saving
    const userTemplates = updatedTemplates.filter(t => !t.isDefault);
    localStorage.setItem('estimate_templates', JSON.stringify(userTemplates));
    setTemplates(updatedTemplates);
  };

  const handleUseTemplate = (template) => {
    // Navigate to new estimate with template data
    navigate('/estimate/new', { state: { template } });
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleSaveAsNewTemplate = () => {
    // Create a copy of the current estimate as a new template
    navigate('/estimate/new', { state: { saveAsTemplate: true } });
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updated = templates.filter(t => t.id !== templateId);
      saveTemplates(updated);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <>
      <div className="templates-container">
        {/* Header */}
        <div className="templates-header">
          <div>
            <h1>⭐ Estimate Templates</h1>
            <p>Save time by using pre-built estimate templates</p>
          </div>
          <button className="btn-new-template" onClick={handleSaveAsNewTemplate}>
            + Create New Template
          </button>
        </div>

        {/* Search */}
        <div className="templates-search">
          <input
            type="text"
            placeholder="Search templates by name, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Templates Grid */}
        <div className="templates-grid">
          {filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Templates Found</h3>
              <p>Create your first template to save time on future estimates</p>
              <button className="btn-primary" onClick={handleSaveAsNewTemplate}>
                + Create Template
              </button>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <div>
                    <h3>{template.name}</h3>
                    <span className="template-category">{template.category}</span>
                  </div>
                  {template.isDefault && (
                    <span className="default-badge">DEFAULT</span>
                  )}
                </div>

                <div className="template-body">
                  <p className="template-description">{template.description}</p>
                  
                  <div className="template-stats">
                    <div className="stat">
                      <span className="stat-label">Items:</span>
                      <span className="stat-value">{template.lineItems.length}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">{formatCurrency(template.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="template-footer">
                  <button 
                    className="btn-use-template"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </button>
                  <button 
                    className="btn-view"
                    onClick={() => handleViewTemplate(template)}
                  >
                    👁️ View
                  </button>
                  {!template.isDefault && (
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Template Preview Modal */}
        {showModal && selectedTemplate && (
          <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowModal(false)}>
            <div className="modal-content large">
              <div className="modal-header">
                <h2>{selectedTemplate.name}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="template-preview">
                  <div className="preview-section">
                    <h3>Description</h3>
                    <p>{selectedTemplate.description}</p>
                  </div>

                  <div className="preview-section">
                    <h3>Line Items ({selectedTemplate.lineItems.length})</h3>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate.lineItems.map((item, index) => (
                          <tr key={index}>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.rate)}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3"><strong>Total</strong></td>
                          <td><strong>{formatCurrency(selectedTemplate.total)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {selectedTemplate.notes && (
                    <div className="preview-section">
                      <h3>Notes</h3>
                      <pre className="preview-notes">{selectedTemplate.notes}</pre>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      setShowModal(false);
                      handleUseTemplate(selectedTemplate);
                    }}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Templates;