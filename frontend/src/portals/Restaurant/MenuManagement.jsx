import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, UtensilsCrossed, Trash2 } from 'lucide-react';

export default function MenuManagement() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Main', available: true, description: '' });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const headers = { 'x-user-id': user?.id, 'x-restaurant-id': user?.id };

  const fetchMenu = async () => {
    try {
      const res = await axios.get('http://localhost:5000/catalog/1', { headers }); // Using catalog endpoint for now
      setMenu(res.data.menu || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/catalog/1/menu', {
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category,
        available: newItem.available,
        description: newItem.description
      }, { headers });
      setNewItem({ name: '', price: '', category: 'Main', available: true, description: '' });
      fetchMenu();
    } catch (err) {
      alert('Failed to add menu item: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleStatus = async (itemName, currentStatus) => {
    try {
      await axios.put(`http://localhost:5000/catalog/1/menu/${itemName}`, { 
        available: !currentStatus,
        name: itemName,
        price: menu.find(m => m.name === itemName)?.price,
        category: menu.find(m => m.name === itemName)?.category,
        description: menu.find(m => m.name === itemName)?.description
      }, { headers });
      fetchMenu();
    } catch (err) {
      alert('Failed to update item: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteItem = async (itemName) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`http://localhost:5000/catalog/1/menu/${itemName}`, { headers });
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{m.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{m.category}</span>
                      </div>
                      <p className="text-gray-900 font-medium">Rs. {m.price}</p>
                      {m.description && <p className="text-sm text-gray-500 mt-1">{m.description}</p>}
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
