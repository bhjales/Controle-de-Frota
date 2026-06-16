import React, { useState } from 'react';
import { Plus, Trash2, Tag, Car } from 'lucide-react';
import { EquipmentType, VehicleCategory } from '../types';
import { FleetStore } from '../store/fleetStore';

interface AdminEquipmentTypesProps {
  types: EquipmentType[];
  vehicleCategories: VehicleCategory[];
  store: FleetStore;
}

export function AdminEquipmentTypes({ types, vehicleCategories, store }: AdminEquipmentTypesProps) {
  const [newTypeName, setNewTypeName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [errorType, setErrorType] = useState('');
  const [errorCat, setErrorCat] = useState('');

  const handleAddType = () => {
    setErrorType('');
    if (!newTypeName.trim()) {
      setErrorType('O nome do tipo é obrigatório.');
      return;
    }
    const res = store.addEquipmentType(newTypeName);
    if (res.success) {
      setNewTypeName('');
    } else {
      setErrorType(res.message);
    }
  };

  const handleAddCat = () => {
    setErrorCat('');
    if (!newCatName.trim()) {
      setErrorCat('O nome da categoria é obrigatório.');
      return;
    }
    const res = store.addVehicleCategory(newCatName);
    if (res.success) {
      setNewCatName('');
    } else {
      setErrorCat(res.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Gerenciar Categorias</h1>
        <p className="text-slate-500 text-sm mt-1">Configure os tipos de equipamentos e as categorias de veículos disponíveis para cadastro no sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Tipos de Equipamento */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Tipos de Equipamentos</h2>
                <p className="text-slate-500 text-xs">Ex: Retroescavadeira, Caminhão Munck, Trator</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newTypeName}
                  onChange={(e) => {
                    setNewTypeName(e.target.value);
                    setErrorType('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                  placeholder="Novo tipo de equipamento..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-sm transition-all focus:bg-white"
                />
                <button 
                  onClick={handleAddType}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar
                </button>
              </div>
              {errorType && <p className="text-xs text-red-500 font-medium px-1">{errorType}</p>}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {types.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs">Nenhum tipo de equipamento cadastrado.</p>
                </div>
              ) : (
                types.map(type => (
                  <div key={type.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-400 font-bold" />
                      <span className="font-semibold text-sm text-slate-700">{type.name}</span>
                    </div>
                    <button 
                      onClick={() => store.deleteEquipmentType(type.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Excluir tipo de equipamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna 2: Categorias de Veículos */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Categorias de Veículos</h2>
                <p className="text-slate-500 text-xs">Ex: Utilitário, Passeio, Pesado, Caminhão</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setErrorCat('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
                  placeholder="Nova categoria de veículo..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-sm transition-all focus:bg-white"
                />
                <button 
                  onClick={handleAddCat}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar
                </button>
              </div>
              {errorCat && <p className="text-xs text-red-500 font-medium px-1">{errorCat}</p>}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {vehicleCategories.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs">Nenhuma categoria de veículo cadastrada.</p>
                </div>
              ) : (
                vehicleCategories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-all">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-sm text-slate-700">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => store.deleteVehicleCategory(cat.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Excluir categoria de veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
