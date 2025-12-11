import React from 'react';
import ClientCard from './ClientCard';

const ClientsList = ({ clients, onEdit, onDelete, onView, calculateClientValue }) => {
  if (clients.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <h3>No Clients Found</h3>
        <p>Try adjusting your search or filters, or add your first client.</p>
      </div>
    );
  }

  return (
    <div className="clients-grid">
      {clients.map(client => (
        <ClientCard
          key={client.id}
          client={client}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          totalValue={calculateClientValue(client.id)}
        />
      ))}
    </div>
  );
};

export default ClientsList;
