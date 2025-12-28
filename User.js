const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ID único do utilizador no Discord
    userId: { type: String, required: true, unique: true },

    // Economia Básica e Apostas
    money: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 }, // Timestamp do último !trabalhar
    workCount: { type: Number, default: 0 }, // Total de vezes que trabalhou
    lastInvest: { type: Number, default: 0 }, // Cooldown para o !investir

    // Inventário
    inventory: { type: Array, default: [] },

    // === SISTEMA DE FACÇÃO ===
    cargo: { type: String, default: "Civil" }, 
    missionCount: { type: Number, default: 0 }, 
    lastTrafico: { type: Number, default: 0 }, 
    lastMission: { type: Number, default: 0 }, 

    // === SISTEMA DE RELACIONAMENTO & CRIME EM DUPLA ===
    marriedWith: { type: String, default: null }, 
    affinity: { type: Number, default: 0 }, 
    lastAssaltoDupla: { type: Number, default: 0 }, // NOVO: Cooldown para o !assaltodupla

    // Sistema de Assassino / Contratos
    contract: { type: String, default: null }, 
    lastContract: { type: Number, default: 0 }, 
    jobsDone: { type: Number, default: 0 }, 
    
    // Sistema de Combate / Roubo Individual
    lastKill: { type: Number, default: 0 }, 
    lastRob: { type: Number, default: 0 }, // Cooldown para o !crime ou !roubar individual
    lastCrime: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
