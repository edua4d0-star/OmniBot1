const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ==================== 👤 IDENTIFICAÇÃO ====================
    userId: { type: String, required: true, unique: true },

    // ==================== 💰 ECONOMIA & BANCO ====================
    money: { type: Number, default: 0 },       
    bank: { type: Number, default: 0 },        
    dirtyMoney: { type: Number, default: 0 },  
    cassinoGasto: { type: Number, default: 0 }, // Para a insígnia 'Viciados'
    lastWork: { type: Number, default: 0 },    
    workCount: { type: Number, default: 0 },   
    lastInvest: { type: Number, default: 0 },  
    lastDaily: { type: Number, default: 0 },   

    // ==================== 🎒 INVENTÁRIO & ESTÉTICA ====================
    inventory: { type: [String], default: [] },   
    bg: { type: String, default: "" },             
    bgInventory: { type: [String], default: [] }, 

    // ==================== 🌑 SISTEMA DE FACÇÃO ====================
    cargo: { type: String, default: "Civil" }, 
    missionCount: { type: Number, default: 0 }, 
    lastTrafico: { type: Number, default: 0 }, 
    lastMission: { type: Number, default: 0 }, 

    // ==================== 💖 RELACIONAMENTO ====================
    marriedWith: { type: String, default: null }, 
    affinity: { type: Number, default: 0 }, 
    marriageDate: { type: String, default: null },      
    coupleBio: { type: String, default: "Unidos pelo destino." }, 
    activeBadge: { type: String, default: "🌱 Iniciante" },     
    traicoes: { type: Number, default: 0 },             
    lastSocial: { type: Number, default: 0 },           
    lastAssaltoDupla: { type: Number, default: 0 }, 
    lastGift: { type: Number, default: 0 },             

    // ==================== 🎯 CONTRATOS & CRIMES ====================
    contract: { type: String, default: null }, 
    lastContract: { type: Number, default: 0 }, 
    jobsDone: { type: Number, default: 0 },    
    lastKill: { type: Number, default: 0 },    
    lastRob: { type: Number, default: 0 },     
    lastCrime: { type: Number, default: 0 },

    // ==================== 🎮 STATUS & MINI-GAMES ====================
    bjVitorias: { type: Number, default: 0 },       // Vitórias no Blackjack
    bjDerrotas: { type: Number, default: 0 },       // Derrotas no Blackjack
    akinatorVitorias: { type: Number, default: 0 }, // Vezes que venceu o gênio
    akinatorDerrotas: { type: Number, default: 0 }  // Vezes que o gênio acertou
});

module.exports = mongoose.model('User', UserSchema);
