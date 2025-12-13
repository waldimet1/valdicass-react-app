import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import '../styles/Trash.css';

const Trash = () => {
  const navigate = useNavigate();
  const [trashedEstimates, setTrashedEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAdmin(user.uid === ADMIN_UID);
        loadTrashedEstimates(user);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadTrashedEstimates = async (user) => {
    setLoading(true);
    try {
      const quotesRef = collection(db, 'quotes');
      let q;
      
      if (user.uid === ADMIN_UID) {
        // Admin sees all deleted quotes
        q = query(
          quotesRef,
          where('status', '==', 'deleted'),
          orderBy('deletedAt', 'desc')
        );
      } else {
        // Salesperson sees only their deleted quotes
        q = query(
          quotesRef,
          where('createdBy', '==', user.uid),
          where('status', '==', 'deleted'),
          orderBy('deletedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const estimatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTrashedEstimates(estimatesData);
    } catch (error) {
      console.error('Error loading trash:', error);
    }
    setLoading(false);
  };

  const handleRestore = async (estimateId) => {
    if (!window.confirm('Restore this estimate?')) return;
    
    try {
     const estimateRef = doc(db, 'quotes', estimateId);
      await updateDoc(estimateRef, {
        status: 'draft',
        deletedAt: null,
        deletedBy: null
      });
      
      alert('✅ Estimate restored successfully');
      loadTrashedEstimates(currentUser);
    } catch (error) {
      console.error('Error restoring estimate:', error);
      alert('❌ Failed to restore: ' + error.message);
    }
  };

  const handlePermanentDelete = async (estimateId, estimateNumber) => {
    if (!isAdmin) {
      alert('❌ Only admins can permanently delete estimates');
      return;
    }
    
    const confirmMessage = `⚠️ PERMANENT DELETE\n\nThis will permanently delete estimate ${estimateNumber}.\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`;
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'DELETE') {
      alert('Deletion cancelled');
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'quotes', estimateId));
      alert('✅ Estimate permanently deleted');
      loadTrashedEstimates(currentUser);
    } catch (error) {
      console.error('Error permanently deleting:', error);
      alert('❌ Failed to delete: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (loading) {
    return <div className="trash-loading">Loading trash...</div>;
  }

  return (
    <div className="trash-container">
      <div className="trash-header">
        <h1>🗑️ Trash</h1>
        <button 
          className="btn-back"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>

      {trashedEstimates.length === 0 ? (
        <div className="trash-empty">
          <p>🎉 Trash is empty!</p>
          <p className="trash-empty-subtitle">Deleted estimates will appear here.</p>
        </div>
      ) : (
        <div className="trash-list">
          <p className="trash-count">
            {trashedEstimates.length} item{trashedEstimates.length !== 1 ? 's' : ''} in trash
          </p>
          
          {trashedEstimates.map((estimate) => (
            <div key={estimate.id} className="trash-card">
              <div className="trash-card-header">
                <div className="trash-card-info">
                  <h3>{estimate.clientName || 'Unknown Client'}</h3>
                  <p className="trash-estimate-number">#{estimate.estimateNumber}</p>
                </div>
                <div className="trash-card-amount">
                  {formatCurrency(estimate.total)}
                </div>
              </div>

              <div className="trash-card-details">
                <p><strong>Deleted:</strong> {formatDate(estimate.deletedAt)}</p>
                {estimate.clientEmail && (
                  <p><strong>Email:</strong> {estimate.clientEmail}</p>
                )}
              </div>

              <div className="trash-card-actions">
                <button 
                  className="btn-restore"
                  onClick={() => handleRestore(estimate.id)}
                >
                  ♻️ Restore
                </button>
                
                {isAdmin && (
                  <button 
                    className="btn-permanent-delete"
                    onClick={() => handlePermanentDelete(estimate.id, estimate.estimateNumber)}
                  >
                    ⚠️ Delete Permanently
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && trashedEstimates.length > 0 && (
        <div className="trash-admin-notice">
          <p>🔒 <strong>Admin Notice:</strong> You can permanently delete estimates. This action cannot be undone.</p>
        </div>
      )}
    </div>
  );
};

export default Trash;