const mongoose = require('mongoose');

// ==================== 🏴‍☠️ SCHEMA DE FACÇÃO (ORGANIZAÇÃO) ====================
const FaccaoSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    liderId: { type: String, required: true },
    cofre: { type: Number, default: 0 },
    membros: { type: [String], default: [] },
    
    // --- ESTRUTURA DISCORD ---
    categoriaId: { type: String }, 
    cargosIds: { type: [String], default: [] },
    canalRecrutamentoId: { type: String },
    
    dataCriacao: { type: Number, default: () => Date.now() } // Ajustado para pegar a data no momento da criação
});

// ==================== 🚩 SCHEMA DE TERRITÓRIOS (AUXILIAR) ====================
const TerritorySchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true }, 
    faccaoDona: { type: String, default: null },               
    defesa: { type: Number, default: 100 },                    
    lucroAcumulado: { type: Number, default: 0 }                
});

// ==================== 👤 SCHEMA DE USUÁRIO (USER) ====================
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    // --- ECONOMIA & TRABALHO ---
    money: { type: Number, default: 0 },       
    bank: { type: Number, default: 0 },        
    dirtyMoney: { type: Number, default: 0 },  
    workCount: { type: Number, default: 0 },   
    lastWork: { type: Number, default: 0 },    
    lastDaily: { type: Number, default: 0 },   
    lastInvest: { type: Number, default: 0 },
    cassinoGasto: { type: Number, default: 0 },

    // --- 🚀 SISTEMA DE VOTOS (NOVO) ---
    lastVote: { type: Number, default: 0 }, // Essencial para o comando !votar de 100k

    // --- INVENTÁRIO & CUSTOMIZAÇÃO ---
    inventory: { type: [String], default: [] },   
    bg: { type: String, default: "" },             
    bgInventory: { type: [String], default: [] }, 

    // --- 🚓 POLÍCIA & CRIME ---
    procurado: { type: Number, default: 0 },    // Estrelas (0 a 5)
    lastSuborno: { type: Number, default: 0 },  
    lastCrime: { type: Number, default: 0 },
    lastRob: { type: Number, default: 0 },
    lastKill: { type: Number, default: 0 },

    // --- 🏴‍☠️ SISTEMA DE FACÇÃO ---
    faccao: { type: String, default: null },    
    cargo: { type: String, default: "Civil" },  
    contribuicaoFaccao: { type: Number, default: 0 },
    missionCount: { type: Number, default: 0 }, 
    lastTrafico: { type: Number, default: 0 }, 
    lastMission: { type: Number, default: 0 }, 

    // --- 💖 SOCIAL & RELACIONAMENTO ---
    marriedWith: { type: String, default: null }, 
    affinity: { type: Number, default: 0 }, 
    marriageDate: { type: String, default: null },      
    coupleBio: { type: String, default: "Unidos pelo destino." }, 
    activeBadge: { type: String, default: "🌱 Iniciante" },     
    traicoes: { type: Number, default: 0 },
    lastSocial: { type: Number, default: 0 },
    lastAssaltoDupla: { type: Number, default: 0 },
    lastGift: { type: Number, default: 0 },

    // --- 🎯 MERCENÁRIO & CONTRATOS ---
    contract: { type: String, default: null }, 
    lastContract: { type: Number, default: 0 },
    jobsDone: { type: Number, default: 0 },

    // --- 🎮 MINI-GAMES & STATUS ---
    bjVitorias: { type: Number, default: 0 },       
    bjDerrotas: { type: Number, default: 0 },       
    akinatorVitorias: { type: Number, default: 0 }, 
    akinatorDerrotas: { type: Number, default: 0 }, 
    bomDiaCount: { type: Number, default: 0 },      
    lastBomDiaDate: { type: Number, default: 0 },   
    totalBomDiaWins: { type: Number, default: 0 }   
});

const User = mongoose.model('User', UserSchema);
const Territory = mongoose.model('Territory', TerritorySchema);
const Faccao = mongoose.model('Faccao', FaccaoSchema);

module.exports = { User, Territory, Faccao };
