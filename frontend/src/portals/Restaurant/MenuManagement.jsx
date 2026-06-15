import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, UtensilsCrossed, Trash2 } from 'lucide-react';

// Helper function to get image based on item name and category
const getImageForItem = (name, category, idx) => {
  const itemName = name.toLowerCase();
  
  // Specific food images
  const foodImages = {
    'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a7f8?w=300&h=200&fit=crop',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop',
    'paratha': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop',
    'karahi': 'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=300&h=200&fit=crop',
    'chai': 'https://images.unsplash.com/photo-1563822249366-3efb23b9e3c5?w=300&h=200&fit=crop',
    'tea': 'https://images.unsplash.com/photo-1563822249366-3efb23b9e3c5?w=300&h=200&fit=crop',
    'cold drink': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'coke': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'pepsi': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop',
    'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop',
    'ice cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop',
    'fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
    'chicken': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&h=200&fit=crop',
    'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=200&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1536304993881-ff6909a3178c?w=300&h=200&fit=crop'
  };
  
  // Check if item name matches any specific food
  for (const key in foodImages) {
    if (itemName.includes(key)) {
      return foodImages[key];
    }
  }
  
  // Fallback to category-based images
  const categoryImages = {
    'Main': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
    'Sides': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
    'Drinks': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'Dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop',
    'Starters': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'BBQ': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop',
    'Breakfast': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop'
  };
  
  return categoryImages[category] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop';
};

export default function MenuManagement() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Main', available: true, description: '', image_url: '' });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);

  const headers = { 'x-user-id': user?.id, 'x-restaurant-id': user?.id };

  const fetchMenu = async () => {
    try {
      const res = await axios.get('http://localhost:5000/restaurant/menu', { headers });
      setMenu(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, image_url: reader.result });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/restaurant/menu/item', {
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category,
        available: newItem.available,
        description: newItem.description,
        image: newItem.image_url || getImageForItem(newItem.name, newItem.category)
      }, { headers });
      setNewItem({ name: '', price: '', category: 'Main', available: true, description: '', image_url: '' });
      setImagePreview(null);
      fetchMenu();
    } catch (err) {
      alert('Failed to add menu item: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleStatus = async (itemName, currentStatus) => {
    try {
      const item = menu.find(m => m.name === itemName);
      await axios.put(`http://localhost:5000/restaurant/menu/item/${itemName}`, { 
        available: !currentStatus,
        name: itemName,
        price: item?.price,
        category: item?.category,
        description: item?.description,
        image: item?.image_url
      }, { headers });
      fetchMenu();
    } catch (err) {
      alert('Failed to update item: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteItem = async (itemName) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`http://localhost:5000/restaurant/menu/item/${itemName}`, { headers });
      fetchMenu();
    } catch (err) {
      alert('Failed to delete item: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf7ff] text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-gray-600">Manage your restaurant's menu items</p>
        </div>
        <button onClick={() => navigate('/restaurant/dashboard')} className="text-[#D62828] font-bold hover:underline">
          ← Back to Dashboard
        </button>
      </header>

      <div className="p-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Item Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#D62828]"/>
              Add Menu Item
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Zinger Burger" 
                  required 
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#D62828] outline-none" 
                  value={newItem.name} 
                  onChange={e=>setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Price (PKR)</label>
                <input 
                  type="number" 
                  placeholder="e.g., 350" 
                  required 
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#D62828] outline-none" 
                  value={newItem.price} 
                  onChange={e=>setNewItem({...newItem, price: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select 
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#D62828] outline-none" 
                  value={newItem.category} 
                  onChange={e=>setNewItem({...newItem, category: e.target.value})}
                >
                  <option value="Main">Main Course</option>
                  <option value="Sides">Sides</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Starters">Starters</option>
                  <option value="BBQ">BBQ</option>
                  <option value="Pizza">Pizza</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea 
                  placeholder="Brief description of the item" 
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#D62828] outline-none" 
                  rows="3"
                  value={newItem.description} 
                  onChange={e=>setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Item Image</label>
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#D62828] outline-none"
                  />
                  {imagePreview && (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                      <button 
                        type="button"
                        onClick={() => {
                          setNewItem({ ...newItem, image_url: '' });
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="available"
                  checked={newItem.available}
                  onChange={e=>setNewItem({...newItem, available: e.target.checked})}
                  className="w-4 h-4 text-[#D62828]"
                />
                <label htmlFor="available" className="text-sm text-gray-700">Available immediately</label>
              </div>
              <button type="submit" className="w-full bg-[#D62828] hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                Add Menu Item
              </button>
            </form>
          </div>

          {/* Menu Items List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-[#D62828]"/>
              Current Menu ({menu.length} items)
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading menu...</div>
            ) : menu.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No menu items yet. Add your first item!</div>
            ) : (
              <div className="grid gap-4">
                {menu.map((m, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:border-[#D62828]/50 transition-all">
                    <div className="flex items-center gap-4 flex-1">
                      <img 
                        src={m.image_url || getImageForItem(m.name, m.category)}
                        alt={m.name} 
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => { e.target.src = getImageForItem(m.name, m.category); }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{m.name}</h3>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{m.category}</span>
                        </div>
                        <p className="text-gray-900 font-medium">Rs. {m.price}</p>
                        {m.description && <p className="text-sm text-gray-500 mt-1">{m.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleStatus(m.name, m.available)}
                        className={`px-4 py-2 font-bold rounded-lg transition-all ${
                          m.available 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {m.available ? 'IN STOCK' : 'SOLD OUT'}
                      </button>
                      <button 
                        onClick={() => deleteItem(m.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete item"
                      >
                        <Trash2 className="w-5 h-5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
