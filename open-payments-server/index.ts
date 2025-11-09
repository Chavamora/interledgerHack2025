import express from 'express';
// ¡Importante! 'session' ya NO es necesario
// import session from 'express-session'; // <--- ELIMINADO
import cors from 'cors';
import {
  createUnauthenticatedClient,
  OpenPaymentsClientError,
  createAuthenticatedClient,
  isPendingGrant,
  isFinalizedGrant
} from '@interledger/open-payments';
import { v4 as uuid } from 'uuid';

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// --- Configuración de Sesión ---
// ¡TODO ESTO SE VA! No es necesario y es la causa del bug.
// app.set('trust proxy', 1);             // <--- ELIMINADO
// app.use(session({ ... }));             // <--- ELIMINADO

app.get('/', (req, res) => {
  res.send('Servidor Open Payments P2P (Hackathon) en ejecución!');
});

// ================================================================
// === 1. ENDPOINTS DEL BENEFICIARIO (Sin cambios) ====
// ================================================================

app.post('/api/create-incoming-payment', async (req, res) => {
  // ... (Este endpoint está perfecto, no necesita cambios)
  const { sellerCredentials, paymentDetails } = req.body;
  if (!sellerCredentials || !paymentDetails) {
    return res.status(400).json({ error: "Faltan 'sellerCredentials' o 'paymentDetails' en el body." });
  }
  const { keyId, privateKeyBase64, walletAddressUrl } = sellerCredentials;
  const { amountValue, assetCode, assetScale } = paymentDetails;
  if (!keyId || !privateKeyBase64 || !walletAddressUrl || !amountValue || !assetCode || assetScale === undefined) {
    return res.status(400).json({ error: "Faltan campos obligatorios dentro de los objetos." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;
  try {
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });
    const walletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });
    const grant = await client.grant.request(
      { url: walletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["list", "read", "read-all", "complete", "create"],
            },
          ],
        },
      },
    );
    if (isPendingGrant(grant)) {
      throw new Error("Se esperaba un grant no interactivo para crear facturas");
    }
    const incomingPaymentDetails = {
      walletAddress: walletAddress.id,
      incomingAmount: {
        value: amountValue,
        assetCode: assetCode,
        assetScale: assetScale
      },
      expiresAt: new Date(Date.now() + 60_000 * 10).toISOString(),
    };
    const incomingPayment = await client.incomingPayment.create(
      {
        url: walletAddress.resourceServer,
        accessToken: grant.access_token.value
      },
      incomingPaymentDetails
    );
    console.log("Factura (Incoming Payment) creada:", incomingPayment.id);
    res.json(incomingPayment);
  } catch (error) {
    console.error("Error en /api/create-incoming-payment:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

app.post('/api/check-payment-status', async (req, res) => {
  // ... (Este endpoint está perfecto, no necesita cambios)
  const { sellerCredentials, paymentUrl } = req.body;
  if (!sellerCredentials || !paymentUrl) {
    return res.status(400).json({ error: "Faltan 'sellerCredentials' o 'paymentUrl' en el body." });
  }
  const { keyId, privateKeyBase64, walletAddressUrl } = sellerCredentials;
  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'sellerCredentials'." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;
  try {
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });
    const beneficiaryWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });
    console.log("Pidiendo grant de solo lectura...");
    const grant = await client.grant.request(
      { url: beneficiaryWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["read"],
            },
          ],
        },
      },
    );
    if (isPendingGrant(grant)) {
      throw new Error("Se esperaba un grant no interactivo para leer");
    }
    console.log(`Verificando estado de: ${paymentUrl}`);
    const paymentStatus = await client.incomingPayment.get(
      {
        url: paymentUrl,
        accessToken: grant.access_token.value
      }
    );
    console.log("Estado del pago obtenido:", paymentStatus);
    res.json({
      message: "Estado del pago obtenido con éxito!",
      paymentStatus: paymentStatus
    });
  } catch (error) {
    console.error("Error en /api/check-payment-status:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});


// ================================================================
// === 2. ENDPOINTS DEL PAGADOR (Corregidos) =========
// ================================================================

app.post('/api/quotes', async (req, res) => {
  // ... (Este endpoint estaba perfecto, no necesita cambios)
  const { payerCredentials, recipientUrl } = req.body;
  if (!payerCredentials || !recipientUrl) {
    return res.status(400).json({ error: "Faltan 'payerCredentials' o 'recipientUrl' en el body." });
  }
  const { keyId, privateKeyBase64, walletAddressUrl } = payerCredentials;
  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'payerCredentials'." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;
  try {
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });
    const payerWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });
    console.log("Pidiendo grant para 'quote'...");
    const quoteGrant = await client.grant.request(
      {
        url: payerWalletAddress.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "quote",
              actions: ["create", "read", "read-all"],
            },
          ],
        },
      },
    );
    if (isPendingGrant(quoteGrant)) {
      throw new Error("Se esperaba un grant no interactivo para 'quote'");
    }
    console.log("Grant para 'quote' obtenido!");
    console.log(`Creando cotización para pagar: ${recipientUrl}`);
    const quote = await client.quote.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
      },
      {
        walletAddress: payerWalletAddress.id,
        receiver: recipientUrl,
        method: "ilp"
      }
    );
    console.log("Cotización creada exitosamente:", quote.id);
    res.json(quote);
  } catch (error) {
    console.error("Error en /api/quotes:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

app.post('/api/finalize-payment', async (req, res) => {
  console.log("Recibida solicitud para finalizar pago...");

  // 1. OBTENER TODOS LOS DATOS (enviados por el frontend)
  const {
    payerCredentials,
    quoteId,
    continueToken,
    continueUri,
    interact_ref
  } = req.body;

  if (!payerCredentials || !quoteId || !continueToken || !continueUri || !interact_ref) {
    return res.status(400).json({ error: "Faltan datos para finalizar el pago." });
  }

  try {
    // 2. RE-CREAR EL CLIENTE (con las credenciales del pagador)
    const { keyId, privateKeyBase64, walletAddressUrl } = payerCredentials;
    const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    // 3. CONTINUAR EL GRANT (¡Esto es lo que dice la documentación!)
    console.log("Continuando el grant para obtener el token final...");
    const finalGrant = await client.grant.continue(
      {
        accessToken: continueToken,
        url: continueUri,
      },
      {
        interact_ref: interact_ref as string,
      },
    );

    if (!isFinalizedGrant(finalGrant)) {
      throw new Error("Se esperaba un grant finalizado, pero sigue pendiente.");
    }

    console.log("¡Grant finalizado! Creando el pago saliente...");

    // 4. ¡ENVIAR EL PAGO!
    const payerWalletAddress = await client.walletAddress.get({ url: walletAddressUrl });
    const payment = await client.outgoingPayment.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: finalGrant.access_token.value,
      },
      {
        walletAddress: payerWalletAddress.id,
        quoteId: quoteId,
      }
    );

    console.log("¡PAGO ENVIADO EXITOSAMENTE!", payment);

    // 5. RESPONDER AL FRONTEND
    res.json({
      message: "Pago exitoso!",
      payment: payment
    });

  } catch (error) {
    console.error("Error en /api/finalize-payment:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

/**
 * Endpoint de CALLBACK.
 * ¡YA NO ES NECESARIO! Lo eliminamos.
 */
// app.get('/api/payment-callback', async (req, res) => { ... }); // <--- ELIMINADO


// ================================================================
// === INICIAR SERVIDOR ===========================================
// ================================================================

// En server.ts, añádelo después de tus otros endpoints

/**
 * Endpoint para obtener el historial de transacciones (entrantes y salientes).
 * * @body {object} userCredentials - Credenciales del monedero del usuario.
 */
// En server.ts

app.post('/api/get-history', async (req, res) => {
  console.log("Recibida solicitud de historial...");
  
  const { userCredentials } = req.body;
  if (!userCredentials) {
    return res.status(400).json({ error: "Faltan 'userCredentials'." });
  }
  // ... (validación de credenciales y 'privateKey') ...
  const { keyId, privateKeyBase64, walletAddressUrl } = userCredentials;
  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'userCredentials'." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    const walletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    console.log("Pidiendo grant para ENTRANTES...");
    const incomingGrant = await client.grant.request(
      { url: walletAddress.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["list", "read"] }] } }
    );
    
    console.log("Pidiendo grant para SALIENTES...");
    const outgoingGrant = await client.grant.request(
      { url: walletAddress.authServer },
      { 
        access_token: { 
          access: [{ 
            type: "outgoing-payment", 
            actions: ["list", "read"],
            identifier: walletAddress.id
          }] 
        } 
      }
    );

    if (isPendingGrant(incomingGrant) || isPendingGrant(outgoingGrant)) {
      throw new Error("Se esperaban grants no interactivos para el historial.");
    }
    
    console.log("Grants obtenidos. Obteniendo listas de pagos...");

    // Obtenemos las listas (esto sí puede ser en paralelo)
    const [incomingPayments, outgoingPayments] = await Promise.all([
      client.incomingPayment.list(
        { url: walletAddress.resourceServer, accessToken: incomingGrant.access_token.value },
        { walletAddress: walletAddress.id }
      ),
      client.outgoingPayment.list(
        { url: walletAddress.resourceServer, accessToken: outgoingGrant.access_token.value },
        { walletAddress: walletAddress.id }
      )
    ]);

    // ... (El resto de la función para combinar y ordenar es igual) ...
    const combinedHistory = [
      ...incomingPayments.map(p => ({
        id: p.id,
        type: 'received',
        amount: p.incomingAmount,
        state: p.state,
        createdAt: p.createdAt,
      })),
      ...outgoingPayments.map(p => ({
        id: p.id,
        type: 'sent',
        amount: p.debitAmount,
        state: p.state,
        createdAt: p.createdAt,
      })),
    ];
    combinedHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`Historial combinado encontrado: ${combinedHistory.length} transacciones.`);
    res.json(combinedHistory);

  } catch (error) {
    console.error("Error en /api/get-history:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

// En server.ts

/**
 * Endpoint para INICIAR el pago interactivo.
 * El Usuario A (pagador) llama a esto después de tener una cotización.
 */
app.post('/api/start-payment', async (req, res) => {
  // 1. Extraemos los datos
  const { payerCredentials, quoteId } = req.body;

  if (!payerCredentials || !quoteId) {
    return res.status(400).json({ error: "Faltan 'payerCredentials' o 'quoteId' en el body." });
  }
  const { keyId, privateKeyBase64, walletAddressUrl } = payerCredentials;

  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'payerCredentials'." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Creamos cliente
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });
    const payerWalletAddress = await client.walletAddress.get({ url: walletAddressUrl });

    // 3. GENERAR EL NONCE
    const nonce = uuid();
    console.log("Pidiendo grant INTERACTIVO para pago saliente...");

    // 4. SOLICITAR EL GRANT INTERACTIVO
    const grant = await client.grant.request(
      { url: payerWalletAddress.authServer },
      {
        access_token: { access: [ {
            identifier: payerWalletAddress.id,
            type: "outgoing-payment",
            actions: ["list", "list-all", "read", "read-all", "create"],
            limits: { quoteId: quoteId },
        }] },
        interact: {
          start: ["redirect"],
          finish: {
            method: "redirect",
            // Apunta al deep link de tu app (como lo requiere tu PayerScreen)
            uri: "my-app://payment/callback", 
            nonce: nonce,
          },
        },
      },
    );

    if (!isPendingGrant(grant)) {
      throw new Error("Se esperaba un grant interactivo (pendiente).");
    }

    console.log("Grant pendiente. El usuario debe interactuar en esta URL:");
    console.log(grant.interact.redirect);

    // 5. Devolvemos TODO lo necesario al frontend
    res.json({
      message: "Grant pendiente. Redirigir al usuario.",
      redirectTo: grant.interact.redirect,
      continueToken: grant.continue.access_token.value,
      continueUri: grant.continue.uri,
      quoteId: quoteId, // Devuelve el quoteId que se usó
    });

  } catch (error) {
    console.error("Error en /api/start-payment:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});


// En server.ts

// En server.ts

// En server.ts

// En server.ts

/**
 * Endpoint para obtener el historial de transacciones.
 * ¡VERSIÓN FINAL Y CORRECTA!
 *
 * NOTA: Evita el bug del Test Wallet pidiendo SÓLO pagos ENTRANTES.
 * Usa la sintaxis correcta de los docs para .list().
 *
 * @body {object} userCredentials - Credenciales del monedero del usuario.
 */
app.post('/api/get-history', async (req, res) => {
  console.log("Recibida solicitud de historial (¡SOLO ENTRANTES!)...");
  
  // 1. Obtener las credenciales
  const { userCredentials } = req.body;
  if (!userCredentials) {
    return res.status(400).json({ error: "Faltan 'userCredentials'." });
  }
  
  const { keyId, privateKeyBase64, walletAddressUrl } = userCredentials;
  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'userCredentials'." });
  }
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Crear el cliente
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    // 3. Obtener el objeto walletAddress
    const walletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    // 4. Obtener UN SOLO GRANT (solo entrantes)
    console.log("Pidiendo grant para ENTRANTES...");
    const incomingGrant = await client.grant.request(
      { url: walletAddress.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["list", "read"] }] } }
    );
    
    // ¡NO PEDIMOS EL GRANT DE SALIENTES (el que tiene el bug)!

    if (isPendingGrant(incomingGrant)) {
      throw new Error("Se esperaba un grant no interactivo para el historial.");
    }
    
    console.log("Grant obtenido. Obteniendo lista de pagos...");

    // 5. LISTAR PAGOS (Usando la sintaxis de los docs)
    const baseUrl = new URL(walletAddressUrl).origin;
    console.log(`Usando URL base del 'origin' del SDK: ${baseUrl}`);

    const incomingPayments = await client.incomingPayment.list(
      {
        url: baseUrl,
        walletAddress: walletAddressUrl, // El 'WALLET_ADDRESS'
        accessToken: incomingGrant.access_token.value
      },
      { first: 50 } // Opciones de paginación
    );

    // 6. Mapear resultados (solo entrantes)
    const combinedHistory = incomingPayments.map(p => ({
      id: p.id,
      type: 'received',
      amount: p.incomingAmount,
      state: p.state,
      createdAt: p.createdAt,
    }));

    combinedHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`Historial de ENTRANTES encontrado: ${combinedHistory.length} transacciones.`);
    
    // 7. Enviar resultado
    // Esta respuesta SÍ tendrá CORS porque es un 200 OK
    res.json(combinedHistory); 

  } catch (error) {
    console.error("Error en /api/get-history:", error);
    // Esta respuesta de error causará el problema de CORS que ves
    res.status(error.status || 500).send(error.description || error.message);
  }
});
app.listen(port, () => {
  console.log(`Servidor P2P escuchando en http://localhost:${port}`);
});
