import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import '../styles/NewEstimate.css';

const NewEstimate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

  const [formData, setFormData] = useState({
    estimateNumber: '',
    date: new Date().toISOString().split('T')[0],
    expirationDate: '',
    poNumber: '',
    
    // Salesperson info (auto-filled)
    salespersonName: '',
    salespersonEmail: '',
    salespersonPhone: '',
    
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    
    lineItems: [],
    
    subtotal: 0,
    taxRate: 0,
    tax: 0,
    discount: 0,
    total: 0,
    
    notes: '',
    
    // Valdicass Contract Terms
    contractTerms: `"Contractor"= Valdicass, Inc. "Owner"= owner of property or authorized agent

1. This Contract shall not be binding on the Contractor unless accepted in writing by an officer of Valdicass at its main office.

2. The signor of Contract certifies that he/she is Owner of the property, or an authorized agent of the Owner.

3. The Owner hereby certifies that he/she has read this Contract, as well as the additional "Policies and Procedures" page. The Owner certifies that he/she fully understands the items and conditions in this contract and that no statement, promise, commitment, guarantee, or representation as to the character or quality of the work or material, or any other representation not contained in this Contract, has been made by the Contractor or any of his agents to induce the Owner to execute this Contract.

4. Any changes to the Contract by the Owner will result in an adjustment to the price. The terms may not be modified or waived orally, but only in writing signed by both Owner and Contractor. Owner agrees to pay Contractor for any and all Extra Work done by Contractor at the above premises on the basis of all labor and material plus 25%. More or less material other than amount contracted for will be debited or credited at current rate.

5. Owner acknowledges that the Contractor, in connection with the work of securing this contract has rendered substantial services and has incurred substantial expense. Such services include, but are not limited to, numerous conferences with Owner, inspection of the premises, preparation of plans and specifications, preparation of layouts, making arrangements for the obtaining of the necessary supplies and materials, obtaining permits, labor and the like. Owner, therefore, agrees and understands that in the event Owner breaches this contract or refuses to proceed or permit Contractor to proceed, then Contractor shall be entitled to an amount equal to 50% of the contract price. Owner may be responsible for any special order (non-stock) material ordered specifically for their job. If the work has begun, Owner agrees to pay in full for all labor and materials furnished up to the date, plus 25% of the total contract price. Contractor may, if it so desires, also proceed at law or in equity and may resort to any other rights it may have, including but not being limited to rights of a mechanic's lien.

6. Contractor shall not be liable for any loss or damage resulting from delay, destruction of, or injury to, the work and material during construction, if caused by strikes, lockouts, labor difficulties, fire, riot, the elements, earthquake, tornado, lightning, public enemy, vandalism, insect damage, or act of God, or any other casualty or cause beyond Contractor's control. This includes post heaving due to extreme weather or repair due to strong winds.

7. Contract Conditions: Owner promises to obtain all necessary permits before the commencement of the work, and assures that their village's present zoning laws allow for the work described in this Contract.

8. Final Payment is due upon completion of the job. A finance charge of 1.5% per month, which is an annual percentage rate of 18%, shall be applied to accounts that are not paid within 7 business days of installation. All materials will remain the property of Valdicass until all invoices pertaining to this job are paid in full. The Contractor reserves the right to repossess all materials used on this job without recourse, and the Owner agrees to allow access to the property to do so. The Owner agrees to pay all interest, reasonable attorney's fees, and any costs incurred in the collections of this debt.

9. Valdicass Inc has been given a projected ETA of 8-12 weeks for the products to be completed by the manufacture from the time of order. Valdicass Inc will install these products on the contract when received within an acceptable and agreeable timeline between the Owner of this project/or responsible party and Valdicass Inc. Due to the pandemic, product shortages, damages to products, and or acts of God, Valdicass Inc cannot be held responsible should the ETA change. Valdicass Inc has agreed to start the work on the set scheduled date so long as the products are in, and the weather conditions allow. Valdicass Inc will call to schedule a specific date of installation once we know when products are in route. Valdicass Inc agrees to commence work on the property no later than 2-3 weeks from receiving the products so long as the weather conditions allow. Valdicass Inc agrees to complete the project per contract no later than 60 days from start date of installation, however the 60 days does not include things that are out of our direct control that may extend that time frame like damaged products, or manufacture delays. Valdicass Inc agrees to allow the customer to terminate this contract should Valdicass Inc fail to start the work of installation within 9 months from the time of order.

10. Customer agrees to pay Valdicass Inc. 40% of the due balance and withhold the remaining 10% on the day of installation in case of any issues or delays that occur no fault to Valdicass. This payment option does not apply when products need to be serviced or corrected by the manufacture directly.`,

    // Cancellation Policy (Admin-only editing)
    cancellationPolicy: `RIGHT TO CANCEL

You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction.

To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice or any other written notice to:

Valdicass, Inc.
8920 W 47th St
Brookfield, Illinois 60513
Phone: (630) 290-5343
Email: mario@valdicass.com`,

    // Cancellation form data (customer fillable)
    cancellationDeadlineDate: '',
    cancellationCustomerSignature: '',
    cancellationCustomerSignDate: '',
    cancellationFormLocked: false, // Locks after deadline passes

    policies: `POLICIES AND PROCEDURES

SCHEDULING:
• 24-hour notice provided before arrival
• Work is weather-dependent and may be rescheduled
• Clear access to work areas required

PROPERTY CARE:
• We protect your property during work
• Existing damage noted before work begins
• Daily debris cleanup

COMMUNICATION:
• Project manager is your main contact
• Progress updates via phone/email
• Questions addressed immediately

QUALITY ASSURANCE:
• All work meets industry standards
• Quality materials and equipment used
• Final walkthrough required before completion`,

    showClientSignature: true,
    showCompanySignature: true,
    
    photos: [],
    attachments: [],
    
    financingEnabled: false,
    financingLink: '',
    
    status: 'draft'
  });

  // Monitor auth state and set salesperson info
  useEffect(() => {
    const loadSalespersonInfo = async (user) => {
      setCurrentUser(user);
      setIsAdmin(user.uid === ADMIN_UID);
      
      // Try to get phone from localStorage first
      const userData = localStorage.getItem(`user_${user.uid}`);
      let phoneNumber = user.phoneNumber || '';
      let displayName = user.displayName || user.email?.split('@')[0] || 'Salesperson';
      
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          phoneNumber = parsedData.phone || phoneNumber;
          displayName = parsedData.displayName || displayName;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Update form with salesperson info
      setFormData(prev => ({
        ...prev,
        salespersonName: displayName,
        salespersonEmail: user.email || '',
        salespersonPhone: phoneNumber
      }));
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadSalespersonInfo(user);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadClients();
    generateEstimateNumber();
    
    // Check if we're loading a template
    if (location.state?.template) {
      loadTemplateData(location.state.template);
    } else if (id) {
      loadEstimate(id);
    }
  }, [id, location.state]);

  const loadTemplateData = (template) => {
    setFormData(prev => ({
      ...prev,
      lineItems: template.lineItems || [],
      notes: template.notes || '',
      subtotal: template.total || 0,
      total: template.total || 0
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.lineItems, formData.taxRate, formData.discount]);

  // Calculate cancellation deadline (3 business days from estimate date)
  useEffect(() => {
    if (formData.date) {
      const deadline = calculateBusinessDays(new Date(formData.date), 3);
      const deadlineString = deadline.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Check if deadline has passed
      const now = new Date();
      const isExpired = now > deadline;
      
      setFormData(prev => ({ 
        ...prev, 
        cancellationDeadlineDate: deadlineString,
        cancellationFormLocked: isExpired
      }));
    }
  }, [formData.date]);

  // Helper function to calculate business days (excluding weekends)
  const calculateBusinessDays = (startDate, days) => {
    let currentDate = new Date(startDate);
    let addedDays = 0;
    
    while (addedDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }
    
    // Set to end of day (midnight)
    currentDate.setHours(23, 59, 59, 999);
    return currentDate;
  };

  const loadClients = () => {
    const savedClients = localStorage.getItem('landscaping_clients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }
  };

  const loadEstimate = (estimateId) => {
    const estimates = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
    const estimate = estimates.find(e => e.id === estimateId);
    if (estimate) {
      setFormData(estimate);
    }
  };

  const generateEstimateNumber = () => {
    const estimates = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
    const lastNumber = estimates.length > 0 
      ? Math.max(...estimates.map(e => parseInt(e.estimateNumber.replace(/\D/g, '')) || 0))
      : 0;
    setFormData(prev => ({ ...prev, estimateNumber: `EST-${String(lastNumber + 1).padStart(5, '0')}` }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: `${client.address || ''}, ${client.city || ''}, ${client.state || ''} ${client.zip || ''}`.trim()
      }));
    }
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: Date.now().toString(), description: '', quantity: 1, rate: 0, total: 0 }
      ]
    }));
  };

  const updateLineItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const rate = parseFloat(updated.rate) || 0;
          const quantity = parseFloat(updated.quantity) || 1;
          updated.total = rate * quantity;
          return updated;
        }
        return item;
      })
    }));
  };

  const removeLineItem = (id) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = parseFloat(formData.discount) || 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (parseFloat(formData.taxRate) / 100);
    const total = afterDiscount + tax;
    
    setFormData(prev => ({ ...prev, subtotal, tax, total }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos].slice(0, 20)
    }));
  };

  const removePhoto = (id) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== id)
    }));
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(2)
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments].slice(0, 10)
    }));
  };

  const removeAttachment = (id) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

 // UPDATE YOUR handleSave FUNCTION IN NewEstimate.jsx

// REPLACE YOUR handleSave FUNCTION IN NewEstimate.jsx WITH THIS:

const handleSave = async (status = 'draft') => {
  setSaving(true);
  try {
    // Prepare estimate data
    const estimateData = {
      ...formData,
      status,
      createdBy: currentUser?.uid || '',
      createdByEmail: currentUser?.email || '',
      updatedAt: serverTimestamp(),
      ...(id ? {} : { createdAt: serverTimestamp() })
    };

    let savedId = id;
    
    // Save to Firestore
    if (id) {
      const estimateRef = doc(db, 'quotes', id);
      await updateDoc(estimateRef, estimateData);
      console.log('✅ Estimate updated:', id);
    } else {
      const docRef = await addDoc(collection(db, 'quotes'), estimateData);
      savedId = docRef.id;
      console.log('✅ New estimate created:', savedId);
    }

    // If sending to client, send email via SendGrid API
    if (status === 'sent' && formData.clientEmail) {
      try {
        // Construct the share URL
        const shareUrl = `${window.location.origin}/quote/${savedId}`;
        
        // Prepare email data
        const emailPayload = {
          quoteId: formData.estimateNumber,
          clientEmail: formData.clientEmail,
          clientName: formData.clientName,
          total: formData.total,
          shareUrl: shareUrl,
          fromEmail: currentUser?.email || 'info@valdicass.com',
          fromName: formData.salespersonName || currentUser?.displayName || 'Valdicass',
          replyTo: currentUser?.email || 'info@valdicass.com'
        };

        // Call Vercel API endpoint
        const emailResponse = await fetch('https://valdicass-react-app.vercel.app/api/send-quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        });

        if (emailResponse.ok) {
          const result = await emailResponse.json();
          console.log('✅ Email sent successfully from:', result.from);
          alert('✅ Estimate saved and email sent successfully!');
        } else {
          const errorText = await emailResponse.text();
          console.error('❌ Email send failed:', errorText);
          alert(`⚠️ Estimate saved, but email failed to send: ${errorText}\n\nPlease send manually to the client.`);
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        alert(`⚠️ Estimate saved, but email failed: ${emailError.message}\n\nPlease send manually to the client.`);
      }
    } else {
      alert('✅ Estimate saved as draft successfully!');
    }

    navigate('/dashboard');
  } catch (error) {
    console.error('❌ Error saving estimate:', error);
    alert(`❌ Error saving estimate: ${error.message}`);
  } finally {
    setSaving(false);
  }
};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="estimate-container">
      {/* Header */}
      <div className="estimate-header">
        <div className="estimate-actions">
          <button className="btn-cancel" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <div className="actions-right">
            <button 
  className="btn-save-draft" 
  onClick={() => handleSave('draft')}
  disabled={saving}
  style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
>
  {saving ? '💾 Saving...' : 'Save as Draft'}
</button>
<button 
  className="btn-save-send" 
  onClick={() => handleSave('sent')}
  disabled={saving}
  style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
>
  {saving ? '💾 Saving & Sending...' : 'Save & Send to Customer'}
</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="estimate-content">
        {/* Company Header */}
        <div className="company-header">
          <div className="company-logo">
            <img src="/valdicass-logo.png" alt="Valdicass" />
          </div>
          <div className="company-info">
            <h3>Valdicass, Inc.</h3>
            <p>8920 W 47th St</p>
            <p>Brookfield, Illinois 60513</p>
            <p>Phone: {formData.salespersonPhone || '(630) 290-5343'}</p>
            <p>www.valdicass.com</p>
          </div>
        </div>

        {/* Salesperson Info (Auto-filled) */}
        <div className="salesperson-section">
          <h3>Prepared By</h3>
          <div className="salesperson-info">
            <p><strong>{formData.salespersonName}</strong></p>
            <p>{formData.salespersonEmail}</p>
            {formData.salespersonPhone && <p>{formData.salespersonPhone}</p>}
          </div>
        </div>

        {/* Estimate Info & Client Selection */}
        <div className="info-grid">
          <div className="info-section">
            <h3>Estimate Information</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Estimate #</label>
                <input
                  type="text"
                  name="estimateNumber"
                  value={formData.estimateNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Expiration Date</label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label>PO Number</label>
                <input
                  type="text"
                  name="poNumber"
                  value={formData.poNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Client Information</h3>
            {formData.clientName ? (
              <div className="client-selected">
                <div className="client-details">
                  <strong>{formData.clientName}</strong>
                  <p>{formData.clientEmail}</p>
                  <p>{formData.clientPhone}</p>
                  <p>{formData.clientAddress}</p>
                </div>
                <button 
                  className="btn-change"
                  onClick={() => setFormData(prev => ({ ...prev, clientId: '', clientName: '' }))}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="client-picker">
                <select onChange={(e) => handleClientSelect(e.target.value)} className="client-select">
                  <option value="">Select Client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
                <button className="btn-add-client" onClick={() => navigate('/clients')}>
                  + Add Client
                </button>
              </div>
            )}
          </div>
        </div>
// REPLACE THE EMAIL BANNER IN NewEstimate.jsx WITH THIS:

<div className="email-info-banner" style={{
  padding: '15px 20px',
  background: 'linear-gradient(135deg, #d1f2eb 0%, #a3e4d7 100%)',
  border: '2px solid #00a651',
  borderRadius: '8px',
  margin: '20px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
}}>
  <span style={{ fontSize: '32px' }}>📧</span>
  <div>
    <p style={{ margin: 0, fontWeight: 600, color: '#0d5c3e', fontSize: '14px' }}>
      Automatic Email Notification
    </p>
    <p style={{ margin: '5px 0 0 0', color: '#0d5c3e', fontSize: '13px', lineHeight: '1.5' }}>
      Clicking "Save & Send" will automatically send a professional email to the customer with a link to view their estimate online.
    </p>
  </div>
</div>
        {/* Line Items */}
        <div className="section">
          <h3>Items & Services</h3>
          <table className="line-items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {formData.lineItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="amount">{formatCurrency(item.total)}</td>
                  <td>
                    <button className="btn-remove" onClick={() => removeLineItem(item.id)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-add-item" onClick={addLineItem}>
            + Add Line Item
          </button>
        </div>

        {/* Totals */}
        <div className="totals-section">
          <div className="totals-grid">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(formData.subtotal)}</span>
            </div>
            <div className="total-row editable">
              <div className="total-label">
                <span>Discount</span>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <span className="negative">-{formatCurrency(formData.discount)}</span>
            </div>
            <div className="total-row editable">
              <div className="total-label">
                <span>Tax Rate (%)</span>
                <input
                  type="number"
                  name="taxRate"
                  value={formData.taxRate}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <span>{formatCurrency(formData.tax)}</span>
            </div>
            <div className="total-row grand-total">
              <strong>Total</strong>
              <strong>{formatCurrency(formData.total)}</strong>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="section">
          <h3>Notes</h3>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Additional notes for the client..."
          />
        </div>

        {/* Photos */}
        <div className="section">
          <h3>Photos</h3>
          <div className="upload-area">
            <input
              type="file"
              id="photoUpload"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
            <button className="btn-upload" onClick={() => document.getElementById('photoUpload').click()}>
              📷 Upload Photos (max 20)
            </button>
          </div>
          {formData.photos.length > 0 && (
            <div className="photos-grid">
              {formData.photos.map(photo => (
                <div key={photo.id} className="photo-thumb">
                  <img src={photo.url} alt={photo.name} />
                  <button className="remove-photo" onClick={() => removePhoto(photo.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="section">
          <h3>Attachments</h3>
          <div className="upload-area">
            <input
              type="file"
              id="attachmentUpload"
              multiple
              onChange={handleAttachmentUpload}
              style={{ display: 'none' }}
            />
            <button className="btn-upload" onClick={() => document.getElementById('attachmentUpload').click()}>
              📎 Upload Files (max 10)
            </button>
          </div>
          {formData.attachments.length > 0 && (
            <div className="attachments-list">
              {formData.attachments.map(file => (
                <div key={file.id} className="attachment">
                  <span>📄 {file.name} ({file.size} KB)</span>
                  <button className="remove-attachment" onClick={() => removeAttachment(file.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financing */}
        <div className="section">
          <div className="section-toggle">
            <label>
              <input
                type="checkbox"
                name="financingEnabled"
                checked={formData.financingEnabled}
                onChange={handleChange}
              />
              <span>Offer Financing Options</span>
            </label>
          </div>
          {formData.financingEnabled && (
            <div className="financing-box">
              <p>💳 <strong>Financing Available</strong></p>
              <p>Apply for flexible payment options to make your project affordable.</p>
              <input
                type="url"
                name="financingLink"
                value={formData.financingLink}
                onChange={handleChange}
                placeholder="https://financing-partner.com/apply"
              />
            </div>
          )}
        </div>

        {/* Contract Terms - Admin Only Editing */}
        <div className="section contract-section admin-only-section">
          <div className="section-header-with-badge">
            <h3>Contract Terms & Conditions</h3>
            {!isAdmin && <span className="admin-only-badge">🔒 Admin Only</span>}
          </div>
          <textarea
            name="contractTerms"
            value={formData.contractTerms}
            onChange={handleChange}
            rows="25"
            className="contract-text"
            readOnly={!isAdmin}
            disabled={!isAdmin}
            style={{
              backgroundColor: !isAdmin ? '#f7fafc' : 'white',
              cursor: !isAdmin ? 'not-allowed' : 'text'
            }}
          />
          {!isAdmin && (
            <p className="admin-note">
              ℹ️ Only administrators can edit the contract terms and conditions.
            </p>
          )}
        </div>

        {/* Policies - Admin Only Editing */}
        <div className="section contract-section admin-only-section">
          <div className="section-header-with-badge">
            <h3>Policies & Procedures</h3>
            {!isAdmin && <span className="admin-only-badge">🔒 Admin Only</span>}
          </div>
          <textarea
            name="policies"
            value={formData.policies}
            onChange={handleChange}
            rows="12"
            className="contract-text"
            readOnly={!isAdmin}
            disabled={!isAdmin}
            style={{
              backgroundColor: !isAdmin ? '#f7fafc' : 'white',
              cursor: !isAdmin ? 'not-allowed' : 'text'
            }}
          />
          {!isAdmin && (
            <p className="admin-note">
              ℹ️ Only administrators can edit the policies and procedures.
            </p>
          )}
        </div>

        {/* Cancellation Policy - Admin Only Editing */}
        <div className="section contract-section cancellation-section">
          <div className="section-header-with-badge">
            <h3>Cancellation Policy</h3>
            {!isAdmin && <span className="admin-only-badge">🔒 Admin Only</span>}
          </div>
          <textarea
            name="cancellationPolicy"
            value={formData.cancellationPolicy}
            onChange={handleChange}
            rows="12"
            className="contract-text"
            readOnly={!isAdmin}
            disabled={!isAdmin}
            style={{
              backgroundColor: !isAdmin ? '#f7fafc' : 'white',
              cursor: !isAdmin ? 'not-allowed' : 'text'
            }}
          />
          {!isAdmin && (
            <p className="admin-note">
              ℹ️ Only administrators can edit the cancellation policy.
            </p>
          )}
        </div>

        {/* Cancellation Form - Customer Fillable */}
        <div className="section cancellation-form-section">
          <h3>Cancellation Notice</h3>
          
          <div className="cancellation-deadline">
            <p><strong>NOT LATER THAN MIDNIGHT OF:</strong></p>
            <div className="deadline-date">
              {formData.cancellationDeadlineDate || 'Select estimate date to calculate deadline'}
            </div>
          </div>

          <div className="cancellation-statement">
            <p className="cancel-text">I HEREBY CANCEL THIS TRANSACTION.</p>
          </div>

          <div className="cancellation-signatures">
            <div className="cancel-signature-field">
              <label>Buyer's Signature</label>
              <input
                type="text"
                name="cancellationCustomerSignature"
                value={formData.cancellationCustomerSignature}
                onChange={handleChange}
                placeholder={formData.cancellationFormLocked ? "Cancellation period expired" : "Type name to sign"}
                disabled={formData.cancellationFormLocked}
                className="signature-input"
                style={{
                  backgroundColor: formData.cancellationFormLocked ? '#f7fafc' : 'white',
                  cursor: formData.cancellationFormLocked ? 'not-allowed' : 'text'
                }}
              />
              <div className="signature-line"></div>
            </div>

            <div className="cancel-signature-field">
              <label>Date</label>
              <input
                type="date"
                name="cancellationCustomerSignDate"
                value={formData.cancellationCustomerSignDate}
                onChange={handleChange}
                disabled={formData.cancellationFormLocked}
                className="date-input"
                style={{
                  backgroundColor: formData.cancellationFormLocked ? '#f7fafc' : 'white',
                  cursor: formData.cancellationFormLocked ? 'not-allowed' : 'text'
                }}
              />
              <div className="signature-line"></div>
            </div>
          </div>

          {formData.cancellationFormLocked && (
            <div className="cancellation-expired-notice">
              ⚠️ The 3-business-day cancellation period has expired. This form is no longer fillable.
            </div>
          )}

          {!formData.cancellationFormLocked && formData.cancellationDeadlineDate && (
            <div className="cancellation-active-notice">
              ✓ Customer may cancel this transaction until {formData.cancellationDeadlineDate}
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="section">
          <h3>Signatures</h3>
          <div className="signatures-grid">
            <div className="signature-box">
              <label>
                <input
                  type="checkbox"
                  name="showClientSignature"
                  checked={formData.showClientSignature}
                  onChange={handleChange}
                />
                <span>Client Signature</span>
              </label>
              <div className="signature-line"></div>
              <p className="signature-label">Client Signature</p>
            </div>
            <div className="signature-box">
              <label>
                <input
                  type="checkbox"
                  name="showCompanySignature"
                  checked={formData.showCompanySignature}
                  onChange={handleChange}
                />
                <span>Company Signature</span>
              </label>
              <div className="signature-line"></div>
              <p className="signature-label">Company Representative</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="estimate-footer">
        <button className="btn-cancel" onClick={() => navigate('/dashboard')}>
          Cancel
        </button>
        <div className="actions-right">
          <button 
  className="btn-save-draft" 
  onClick={() => handleSave('draft')}
  disabled={saving}
  style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
>
  {saving ? '💾 Saving...' : 'Save as Draft'}
</button>
<button 
  className="btn-save-send" 
  onClick={() => handleSave('sent')}
  disabled={saving}
  style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
>
  {saving ? '💾 Saving & Sending...' : 'Save & Send to Customer'}
</button>
        </div>
      </div>
    </div>
  );
};

export default NewEstimate;