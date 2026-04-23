const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========== CREDENCIAIS DEFINITIVAS PRODUÇÃO ==========
const ACCESS_TOKEN = 'APP_USR-7963257996384989-042112-561b320c44d5a9d748a9556fd3a768cb-656135150';
const PUBLIC_KEY = 'APP_USR-a39565b3-3ce9-4040-bf38-56586ea397ca';

// Configurar Mercado Pago
mercadopago.configure({
    access_token: ACCESS_TOKEN
});

console.log('🚀 Modo PRODUÇÃO ativado!');
console.log('⚠️  Transações REAIS com dinheiro!');

function generateIdempotencyKey() {
    return crypto.randomBytes(16).toString('hex');
}

// ========== FUNÇÕES DE CÁLCULO ==========

// FUNÇÃO PARA CALCULAR DESCONTO DO PIX
function calcularDescontoPix(valorTotal) {
    if (valorTotal <= 250) {
        return { percentual: 0, valor: 0 };
    } else if (valorTotal >= 251 && valorTotal <= 350) {
        const percentual = 1.5;
        return { percentual, valor: valorTotal * (percentual / 100) };
    } else if (valorTotal >= 351 && valorTotal <= 500) {
        const percentual = 2;
        return { percentual, valor: valorTotal * (percentual / 100) };
    } else {
        const percentual = 2.5;
        return { percentual, valor: valorTotal * (percentual / 100) };
    }
}

// FUNÇÃO PARA CALCULAR TAXA DO CARTÃO
function calcularTaxaCartao(valorTotal, metodo, parcelas = 1) {
    let percentual = 0;
    
    if (metodo === 'debito') {
        percentual = 0;
    } else if (metodo === 'credito_avista') {
        percentual = 0;
    } else if (metodo === 'credito_parcelado') {
        percentual = 6 + (parcelas - 1) * 0.5;
    }
    
    return {
        percentual,
        valor: valorTotal * (percentual / 100),
        valorFinal: valorTotal + (valorTotal * (percentual / 100))
    };
}

// ========== ROTAS DA API ==========

// ROTA PIX COM DESCONTO
app.post('/api/pix', async (req, res) => {
    try {
        let { valor, frete = 0 } = req.body;
        const valorTotal = valor + frete;
        
        const desconto = calcularDescontoPix(valorTotal);
        const valorComDesconto = valorTotal - desconto.valor;
        
        const payment_data = {
            transaction_amount: Number(valorComDesconto.toFixed(2)),
            description: 'Pedido Prestige Store',
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@prestige.com.br'
            }
        };
        
        const idempotencyKey = generateIdempotencyKey();
        const response = await mercadopago.payment.create(payment_data, { idempotencyKey });
        
        const pixData = response.body.point_of_interaction.transaction_data;
        
        res.json({
            status: 'ok',
            metodo: 'pix',
            valor_original: valorTotal,
            desconto: {
                percentual: desconto.percentual,
                valor: desconto.valor
            },
            valor_final: valorComDesconto,
            qr_code: pixData.qr_code,
            qr_code_base64: pixData.qr_code_base64,
            payment_id: response.body.id
        });
        
    } catch (error) {
        console.error('Erro PIX:', error.message);
        res.status(500).json({ erro: error.message });
    }
});

// ROTA CARTÃO DE DÉBITO
app.post('/api/debito', async (req, res) => {
    try {
        let { valor, frete = 0, token_card } = req.body;
        const valorTotal = valor + frete;
        
        const taxa = calcularTaxaCartao(valorTotal, 'debito');
        
        const payment_data = {
            transaction_amount: Number(taxa.valorFinal.toFixed(2)),
            description: 'Pedido Prestige Store - Débito',
            payment_method_id: 'debit_card',
            payer: {
                email: 'cliente@prestige.com.br'
            },
            token: token_card,
            installments: 1
        };
        
        const idempotencyKey = generateIdempotencyKey();
        const response = await mercadopago.payment.create(payment_data, { idempotencyKey });
        
        res.json({
            status: 'ok',
            metodo: 'debito',
            valor_original: valorTotal,
            taxa: {
                percentual: taxa.percentual,
                valor: taxa.valor
            },
            valor_final: taxa.valorFinal,
            payment_id: response.body.id,
            status_pagamento: response.body.status
        });
        
    } catch (error) {
        console.error('Erro Débito:', error.message);
        res.status(500).json({ erro: error.message });
    }
});

// ROTA CARTÃO DE CRÉDITO
app.post('/api/credito', async (req, res) => {
    try {
        let { valor, frete = 0, token_card, parcelas = 1 } = req.body;
        const valorTotal = valor + frete;
        
        const tipo = parcelas === 1 ? 'credito_avista' : 'credito_parcelado';
        const taxa = calcularTaxaCartao(valorTotal, tipo, parcelas);
        
        const payment_data = {
            transaction_amount: Number(taxa.valorFinal.toFixed(2)),
            description: `Pedido Prestige Store - Crédito ${parcelas}x`,
            payment_method_id: 'credit_card',
            payer: {
                email: 'cliente@prestige.com.br'
            },
            token: token_card,
            installments: parcelas
        };
        
        const idempotencyKey = generateIdempotencyKey();
        const response = await mercadopago.payment.create(payment_data, { idempotencyKey });
        
        res.json({
            status: 'ok',
            metodo: 'credito',
            parcelas,
            valor_original: valorTotal,
            taxa: {
                percentual: taxa.percentual,
                valor: taxa.valor
            },
            valor_final: taxa.valorFinal,
            payment_id: response.body.id,
            status_pagamento: response.body.status
        });
        
    } catch (error) {
        console.error('Erro Crédito:', error.message);
        res.status(500).json({ erro: error.message });
    }
});

// ROTA PARA CALCULAR
app.post('/api/calcular', (req, res) => {
    try {
        let { valor, frete = 0, metodo, parcelas = 1 } = req.body;
        const valorTotal = valor + frete;
        
        let resultado = {
            valor_original: valorTotal,
            frete: frete,
            produtos: valor
        };
        
        if (metodo === 'pix') {
            const desconto = calcularDescontoPix(valorTotal);
            resultado.desconto = {
                tipo: 'PIX',
                percentual: desconto.percentual,
                valor: desconto.valor
            };
            resultado.valor_final = valorTotal - desconto.valor;
        } 
        else if (metodo === 'debito') {
            const taxa = calcularTaxaCartao(valorTotal, 'debito');
            resultado.taxa = {
                tipo: 'Débito',
                percentual: taxa.percentual,
                valor: taxa.valor
            };
            resultado.valor_final = taxa.valorFinal;
        }
        else if (metodo === 'credito') {
            const tipo = parcelas === 1 ? 'credito_avista' : 'credito_parcelado';
            const taxa = calcularTaxaCartao(valorTotal, tipo, parcelas);
            resultado.taxa = {
                tipo: parcelas === 1 ? 'Crédito à vista' : `Crédito ${parcelas}x`,
                percentual: taxa.percentual,
                valor: taxa.valor
            };
            resultado.valor_final = taxa.valorFinal;
            resultado.parcelas = parcelas;
        }
        
        res.json(resultado);
        
    } catch (error) {
        console.error('Erro calcular:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ROTA TESTE
app.get('/api/teste', (req, res) => {
    res.json({ 
        status: 'API funcionando em PRODUÇÃO',
        public_key: PUBLIC_KEY,
        modo: 'produção'
    });
});

// ========== INICIAR SERVIDOR ==========
const PORT = 3000;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🔥 Prestige Store - Backend');
    console.log('='.repeat(50));
    console.log(`📡 Servidor: http://localhost:${PORT}`);
    console.log(`🔑 Modo: PRODUÇÃO (transações REAIS)`);
    console.log(`💳 PIX: Desconto progressivo`);
    console.log(`💳 Débito: 0% taxa`);
    console.log(`💳 Crédito à vista: 0% taxa`);
    console.log(`💳 Crédito parcelado: 6% + 0.5%/parcela`);
    console.log('='.repeat(50));
    console.log('⚠️  CUIDADO: Transações com dinheiro REAL!');
    console.log('='.repeat(50));
});