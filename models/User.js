const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ==================== 👤 IDENTIFICAÇÃO ====================
    userId: { type: String, required: true, unique: true },

    // ==================== 💰 ECONOMIA & BANCO ====================
    money: { type: Number, default: 0 },       // Dinheiro na mão
    bank: { type: Number, default: 0 },        // Dinheiro no banco
    lastWork: { type: Number, default: 0 },    
    workCount: { type: Number, default: 0 },   
    lastInvest: { type: Number, default: 0 },  
    lastDaily: { type: Number, default: 0 },   

    // ==================== 🎒 INVENTÁRIO & ESTÉTICA ====================
    inventory: { type: Array, default: [] },   
    bg: { type: String, default: "" },         // Link do fundo atual equipado
    bgInventory: { type: Array, default: [] }, // LISTA DE IDS COMPRADOS (NOVO)

    // ==================== 🌑 SISTEMA DE FACÇÃO ====================
    cargo: { type: String, default: "Civil" }, 
    missionCount: { type: Number, default: 0 }, 
    lastTrafico: { type: Number, default: 0 }, 
    lastMission: { type: Number, default: 0 }, 

    // ==================== 💖 RELACIONAMENTO ====================
    marriedWith: { type: String, default: null }, 
    affinity: { type: Number, default: 0 }, 
    lastAssaltoDupla: { type: Number, default: 0 }, 

    // ==================== 🎯 CONTRATOS & CRIMES ====================
    contract: { type: String, default: null }, 
    lastContract: { type: Number, default: 0 }, 
    jobsDone: { type: Number, default: 0 }, 
    lastKill: { type: Number, default: 0 }, 
    lastRob: { type: Number, default: 0 },    
    lastCrime: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
