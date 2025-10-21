import React, { useState, useEffect, useRef } from 'react';
import './ItemSearchModal.css';

const ItemSearchModal = ({ isOpen, onClose, onSelect, squarePosition }) => {
  const [manualItem, setManualItem] = useState({
    name: '',
    icon: null,
    iconPreview: null
  });
  const fileInputRef = useRef(null);

  // Reset manual item when modal closes
  useEffect(() => {
    if (!isOpen) {
      setManualItem({
        name: '',
        icon: null,
        iconPreview: null
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle image file selection
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setManualItem(prev => ({
            ...prev,
            icon: file,
            iconPreview: e.target.result
          }));
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    }
  };

  // Handle manual item creation
  const handleCreateManualItem = () => {
    if (!manualItem.name.trim()) {
      alert('Please enter an item name');
      return;
    }

    const item = {
      id: `manual_${Date.now()}`,
      name: manualItem.name.trim(),
      icon_url: manualItem.iconPreview || '/icons/default-item.png',
      examine: '', 
      isManual: true
    };

    onSelect(item);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Item to Square {squarePosition}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="manual-section-header">
          <h3>Create Trackable Item</h3>
          <p>Enter an item name that will be automatically tracked through RuneMetrics activities</p>
        </div>

        <div className="manual-section">
          <div className="manual-form">
            <div className="form-group">
              <label>Item Name:</label>
              <input
                type="text"
                className="manual-input"
                placeholder="Enter item name (e.g., Dragon Scimitar, Bandos Chestplate, Abyssal Whip)"
                value={manualItem.name}
                onChange={(e) => setManualItem(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Item Icon (Optional):</label>
              <div className="icon-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  className="choose-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Icon
                </button>
                {manualItem.iconPreview && (
                  <div className="icon-preview">
                    <img src={manualItem.iconPreview} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button"
                className="add-item-btn"
                onClick={handleCreateManualItem}
                disabled={!manualItem.name.trim()}
              >
                Add Item to Square
              </button>
            </div>
          </div>
        </div>

        <div className="info-section">
          <div className="info-box">
            <h4>🎯 How it works:</h4>
            <ul>
              <li>Enter the exact name of the item as it appears in RuneScape</li>
              <li>When a player gets this item, it will appear in their RuneMetrics activity feed</li>
              <li>The system will automatically detect the item name in activities like "I found an Abyssal Whip"</li>
              <li>The bingo square will be marked complete automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemSearchModal;