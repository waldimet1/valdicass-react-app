import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import '../styles/Settings.css';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Load saved user data
        const savedData = localStorage.getItem(`user_${currentUser.uid}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setFormData({
            displayName: currentUser.displayName || parsed.displayName || '',
            email: currentUser.email || '',
            phone: currentUser.phoneNumber || parsed.phone || ''
          });
        } else {
          setFormData({
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            phone: currentUser.phoneNumber || ''
          });
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (user) {
      // Save to localStorage
      localStorage.setItem(`user_${user.uid}`, JSON.stringify(formData));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <>
      <div className="settings-container">
        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your profile and preferences</p>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h2>Profile Information</h2>
            <p className="section-description">
              This information will appear on estimates you create
            </p>

            <div className="form-grid">
              <div className="form-field">
                <label>Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  style={{ backgroundColor: '#f7fafc', cursor: 'not-allowed' }}
                />
                <span className="field-note">Email cannot be changed here</span>
              </div>

              <div className="form-field">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(708) 255-5231"
                />
                <span className="field-note">
                  This will appear on your estimates
                </span>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-save" onClick={handleSave}>
                💾 Save Changes
              </button>
              {saved && (
                <span className="saved-message">✓ Saved successfully!</span>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h2>About Estimates</h2>
            <div className="info-box">
              <p>
                <strong>Your Contact Information</strong>
              </p>
              <p>
                When you create an estimate, your name, email, and phone number 
                will automatically appear in the "Prepared By" section and as the 
                contact phone number in the company header.
              </p>
              <p>
                Make sure your phone number is up to date so clients can reach you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;