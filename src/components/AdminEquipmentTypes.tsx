import React, { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { EquipmentType } from '../types';
import { FleetStore } from '../store/fleetStore';

interface AdminEquipmentTypesProps {
  types: EquipmentType[];
  store: FleetStore;
}

export function AdminEquipmentTypes({ types, store }: AdminEquipmentTypesProps) {
  const [newTypeName, setNewTypeName] = useState('');

  const handleAdd = () => {
    const res = store.addEquipmentType(newTypeName);
    if (res.success) {
      setNewTypeName('');
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      <h2 className="text-lg font-extrabold text-slate-800">Gerenciar Tipos de Equipamentos</h2>
      
      <div className="flex gap-2">
        <input 
          type="text"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder="Nome do tipo (ex: Escavadeira)..."
          className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-sm"
        />
        <button 
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Cadastrar
        </button>
      </div>

      <div className="space-y-2">
        {types.map(type => (
          <div key={type.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-sm text-slate-700">{type.name}</span>
            </div>
            <button 
              onClick={() => store.deleteEquipmentType(type.id)}
              className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
