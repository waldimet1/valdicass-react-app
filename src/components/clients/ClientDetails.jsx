import React from 'react';

const ClientDetails = ({ client, onClose, onEdit, calculateClientValue }) => {
  // Get related data
  const quotes = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
  const appointments = JSON.parse(localStorage.getItem('landscaping_appointments') || '[]');
  const clientQuotes = quotes.filter(q => q.clientId === client.id);
  const clientAppointments = appointments.filter(a => a.clientId === client.id);
  
  const totalValue = calculateClientValue(client.id);
  const avgValue = clientQuotes.length > 0 ? totalValue / clientQuotes.length : 0;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal active') {
      onClose();
    }
  };

  return (
    <div className="modal active" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{client.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Contact Information */}
          <div className="details-section">
            <h3>📋 Contact Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Email</div>
                <div className="detail-value">{client.email}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Phone</div>
                <div className="detail-value">{client.phone}</div>
              </div>
              {client.company && (
                <div className="detail-item">
                  <div className="detail-label">Company</div>
                  <div className="detail-value">{client.company}</div>
                </div>
              )}
              <div className="detail-item">
                <div className="detail-label">Client Type</div>
                <div className="detail-value">
                  {client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </div>
              </div>
              {client.address && (
                <div className="detail-item full-width">
                  <div className="detail-label">Address</div>
                  <div className="detail-value">
                    {client.address}
                    {client.city && `, ${client.city}`}
                    {client.state && `, ${client.state}`}
                    {client.zip && ` ${client.zip}`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Statistics */}
          <div className="details-section">
            <h3>📊 Client Statistics</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Total Estimates</div>
                <div className="detail-value">{clientQuotes.length}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Total Appointments</div>
                <div className="detail-value">{clientAppointments.length}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Total Value</div>
                <div className="detail-value">${totalValue.toLocaleString()}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Average Estimate</div>
                <div className="detail-value">${avgValue.toLocaleString()}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Client Since</div>
                <div className="detail-value">
                  {new Date(client.dateAdded).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Related Estimates */}
          <div className="details-section">
            <h3>💰 Related Estimates</h3>
            <div className="related-items">
              {clientQuotes.length > 0 ? (
                clientQuotes.map(quote => (
                  <div key={quote.id} className="related-item">
                    <div className="related-item-info">
                      <div className="related-item-title">{quote.projectName}</div>
                      <div className="related-item-meta">
                        {new Date(quote.date).toLocaleDateString()} • ${parseFloat(quote.total).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => window.location.href = '/estimates'}
                    >
                      View
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-text">No estimates yet</p>
              )}
            </div>
          </div>

          {/* Related Appointments */}
          <div className="details-section">
            <h3>📅 Related Appointments</h3>
            <div className="related-items">
              {clientAppointments.length > 0 ? (
                clientAppointments.map(apt => (
                  <div key={apt.id} className="related-item">
                    <div className="related-item-info">
                      <div className="related-item-title">{apt.title}</div>
                      <div className="related-item-meta">
                        {new Date(apt.date).toLocaleDateString()} at {apt.time}
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => window.location.href = '/calendar'}
                    >
                      View
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-text">No appointments scheduled</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="details-section">
            <h3>📝 Notes & History</h3>
            <div className="notes-list">
              {client.notes ? (
                <div className="note-item">
                  <div className="note-header">
                    <span>Added on {new Date(client.dateAdded).toLocaleDateString()}</span>
                  </div>
                  <div className="note-content">{client.notes}</div>
                </div>
              ) : (
                <p className="empty-text">No notes added</p>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary" onClick={onEdit}>
              Edit Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
