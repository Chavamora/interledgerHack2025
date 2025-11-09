import express from 'express';
// ¡Importante! Añadimos 'session' para el flujo de pago interactivo
import session from 'express-session';
import cors from 'cors'; // <--- 1. IMPORTA 'cors'
// Importamos todo lo necesario de open-payments
import {
  createUnauthenticatedClient,
  OpenPaymentsClientError,
  createAuthenticatedClient,
  isPendingGrant,
  isFinalizedGrant
} from '@interledger/open-payments';
// Importamos 'uuid' para generar el 'nonce' en el flujo de pago
import { v4 as uuid } from 'uuid';

const app = express();
const port = 3000;
app.use(cors()); // <--- 2. AÑADE ESTA LÍNEA
app.use(express.json()); // Middleware para parsear JSON

// --- Configuración de Sesión ---
// Usaremos la sesión para guardar de forma segura los detalles
// del 'grant pendiente' durante el flujo de pago interactivo del PAGADOR.
// Esto reemplaza las variables globales (que no son seguras).
app.use(
  session({
    // ¡Cambia esto por una cadena secreta larga y aleatoria!
    secret: 'mi-secreto-para-el-hackathon-open-payments',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Poner en 'true' si usas HTTPS en producción
      httpOnly: true, // El frontend no puede leer la cookie
      maxAge: 1000 * 60 * 15 // La sesión expira en 15 minutos
    }
  })
);

app.get('/', (req, res) => {
  res.send('Servidor Open Payments P2P (Hackathon) en ejecución!');
});

// ================================================================
// === 1. ENDPOINTS DEL BENEFICIARIO (EL QUE RECIBE EL DINERO) ====
// ================================================================
//

/**
 * Endpoint para crear una nueva factura (Incoming Payment).
 * El Usuario B (receptor) llama a esto desde el frontend.
 *
 * @body {object} sellerCredentials - Credenciales del Test Wallet del receptor.
 * @body {object} paymentDetails - Detalles del monto a cobrar.
 */
app.post('/api/create-incoming-payment', async (req, res) => {
  // 1. Extraemos AMBOS grupos de datos del body
  const { sellerCredentials, paymentDetails } = req.body;

  if (!sellerCredentials || !paymentDetails) {
    return res.status(400).json({ error: "Faltan 'sellerCredentials' o 'paymentDetails' en el body." });
  }

  const { keyId, privateKeyBase64, walletAddressUrl } = sellerCredentials;
  const { amountValue, assetCode, assetScale } = paymentDetails;

  if (!keyId || !privateKeyBase64 || !walletAddressUrl || !amountValue || !assetCode || assetScale === undefined) {
    return res.status(400).json({ error: "Faltan campos obligatorios dentro de los objetos." });
  }
  
  // Reconstruimos la clave privada desde base64
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Usamos las credenciales dinámicas
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    const walletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    // 3. Obtenemos el grant para crear la factura
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
    
    // 4. Usamos los detalles del pago dinámicos
    const incomingPaymentDetails = {
      walletAddress: walletAddress.id,
      incomingAmount: {
        value: amountValue,
        assetCode: assetCode,
        assetScale: assetScale
      },
      // Expira en 10 minutos
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
    
    // 5. Devolvemos la factura al frontend
    res.json(incomingPayment);

  } catch (error) {
    console.error("Error en /api/create-incoming-payment:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});


/**
 * Endpoint para verificar el estado de una factura.
 * El Usuario B (receptor) llama a esto para ver si ya le pagaron.
 *
 * @body {object} sellerCredentials - Credenciales del Test Wallet del receptor.
 * @body {string} paymentUrl - La URL/ID de la factura que se quiere checar.
 */
app.post('/api/check-payment-status', async (req, res) => {
  // 1. Extraemos los datos del body
  const { sellerCredentials, paymentUrl } = req.body;

  if (!sellerCredentials || !paymentUrl) {
    return res.status(400).json({ error: "Faltan 'sellerCredentials' o 'paymentUrl' en el body." });
  }

  const { keyId, privateKeyBase64, walletAddressUrl } = sellerCredentials;

  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'sellerCredentials'." });
  }

  // Reconstruimos la clave privada
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Creamos un cliente con las credenciales del VENDEDOR
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    const beneficiaryWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    // 3. OBTENER UN GRANT DE SOLO LECTURA
    console.log("Pidiendo grant de solo lectura...");
    const grant = await client.grant.request(
      { url: beneficiaryWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["read"], // Solo necesitamos permiso para leer
            },
          ],
        },
      },
    );

    if (isPendingGrant(grant)) {
      throw new Error("Se esperaba un grant no interactivo para leer");
    }

    // 4. USAR EL GRANT PARA OBTENER EL ESTADO DEL PAGO
    console.log(`Verificando estado de: ${paymentUrl}`);
    const paymentStatus = await client.incomingPayment.get(
      {
        url: paymentUrl, // La URL de la factura que nos pasó el frontend
        accessToken: grant.access_token.value // El token de lectura
      }
    );

    console.log("Estado del pago obtenido:", paymentStatus);

    // 5. ENVIAR EL RESULTADO
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
// === 2. ENDPOINTS DEL PAGADOR (EL QUE ENVÍA EL DINERO) =========
// ================================================================

// --- (PENDIENTE) ---
// Aquí es donde refactorizaremos los endpoints:
// 1. POST /api/quotes (Antes '/payer-create-quote')
// 2. POST /api/start-payment (Antes '/payer-start-payment')
// 3. GET  /api/payment-callback (Antes '/payer-payment-approved')
// ================================================================
// === 2. ENDPOINTS DEL PAGADOR (EL QUE ENVÍA EL DINERO) =========
// ================================================================

/**
 * Endpoint para crear una "Cotización" (Quote).
 * El Usuario A (pagador) llama a esto ANTES de pagar.
 * Esto "congela" el tipo de cambio y las comisiones.
 *
 * @body {object} payerCredentials - Credenciales del Test Wallet del PAGADOR.
 * @body {string} recipientUrl - La URL/ID de la factura (Incoming Payment) que se va a pagar.
 */
app.post('/api/quotes', async (req, res) => {
  // 1. Extraemos los datos del body
  const { payerCredentials, recipientUrl } = req.body;

  if (!payerCredentials || !recipientUrl) {
    return res.status(400).json({ error: "Faltan 'payerCredentials' o 'recipientUrl' en el body." });
  }

  const { keyId, privateKeyBase64, walletAddressUrl } = payerCredentials;

  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'payerCredentials'." });
  }

  // Reconstruimos la clave privada del PAGADOR
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Creamos un cliente con las credenciales del PAGADOR
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    const payerWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    // 3. OBTENER UN GRANT PARA CREAR UNA COTIZACIÓN
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

    // 4. CREAR LA COTIZACIÓN
    console.log(`Creando cotización para pagar: ${recipientUrl}`);
    const quote = await client.quote.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
      },
      {
        walletAddress: payerWalletAddress.id, // La billetera del PAGADOR
        receiver: recipientUrl,             // La factura del RECEPTOR
        method: "ilp" // Especificamos que queremos una cotización para un pago ILP
      }
    );

    console.log("Cotización creada exitosamente:", quote.id);

    // 5. ENVIAR EL RESULTADO
    // El frontend necesita este objeto (especialmente el 'quote.id')
    res.json(quote);

  } catch (error) {
    console.error("Error en /api/quotes:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

/**
 * Endpoint para INICIAR el pago interactivo.
 * El Usuario A (pagador) llama a esto después de tener una cotización.
 *
 * @body {object} payerCredentials - Credenciales del Test Wallet del PAGADOR.
 * @body {string} quoteId - La URL/ID de la cotización (del paso anterior).
 */
app.post('/api/start-payment', async (req, res) => {
  // 1. Extraemos los datos del body
  const { payerCredentials, quoteId } = req.body;

  if (!payerCredentials || !quoteId) {
    return res.status(400).json({ error: "Faltan 'payerCredentials' o 'quoteId' en el body." });
  }

  const { keyId, privateKeyBase64, walletAddressUrl } = payerCredentials;

  if (!keyId || !privateKeyBase64 || !walletAddressUrl) {
    return res.status(400).json({ error: "Faltan campos en 'payerCredentials'." });
  }

  // Reconstruimos la clave privada del PAGADOR
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  try {
    // 2. Creamos un cliente con las credenciales del PAGADOR
    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    const payerWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    // 3. GENERAR EL NONCE
    // Un valor único de seguridad que enviaremos al Auth Server
    // y que él nos devolverá en el callback para verificar que la petición es legítima.
    const nonce = uuid();

    console.log("Pidiendo grant INTERACTIVO para pago saliente...");

    // 4. SOLICITAR EL GRANT INTERACTIVO
    const grant = await client.grant.request(
      {
        url: payerWalletAddress.authServer,
      },
      {
        access_token: {
          access: [
            {
              identifier: payerWalletAddress.id,
              type: "outgoing-payment",
              actions: ["list", "list-all", "read", "read-all", "create"],
              limits: {
                // Usamos la cotización dinámica que nos pasó el frontend
                quoteId: quoteId
              },
            },
          ],
        },
        interact: {
          start: ["redirect"],
          finish: {
            method: "redirect",
            // ¡IMPORTANTE! Esta es la URL de NUESTRO backend
            // a la que el Test Wallet redirigirá al usuario cuando apruebe el pago.
            uri: "http://localhost:3000/api/payment-callback", // Nuestro siguiente endpoint
            nonce: nonce, // Enviamos nuestro valor único
          },
        },
      },
    );

    if (!isPendingGrant(grant)) {
      throw new Error("Se esperaba un grant interactivo (pendiente), pero se recibió un grant finalizado.");
    }

    // 5. ¡GUARDAR EN LA SESIÓN! (No en variables globales)
    // Guardamos los detalles necesarios para el siguiente paso (el callback)
    // @ts-ignore (Si no usas TypeScript, puedes ignorar esta línea)
    req.session.paymentDetails = {
      continueToken: grant.continue.access_token.value,
      continueUri: grant.continue.uri,
      nonce: nonce,
      quoteId: quoteId,
      payerCredentials: payerCredentials // ¡Guardamos las credenciales para usarlas en el callback!
    };

    console.log("Grant pendiente. El usuario debe interactuar en esta URL:");
    console.log(grant.interact.redirect);

    // 6. ENVIAR LA URL DE REDIRECCIÓN AL FRONTEND
    // El frontend DEBE tomar esta URL y redirigir al usuario a ella.
    res.json({
      message: "Grant pendiente. Redirigir al usuario a esta URL.",
      redirectTo: grant.interact.redirect
    });

  } catch (error) {
    console.error("Error en /api/start-payment:", error);
    res.status(error.status || 500).send(error.description || error.message);
  }
});

/**
 * Endpoint de CALLBACK. El Auth Server (Test Wallet) redirige
 * el navegador del usuario aquí después de la aprobación.
 *
 * ¡Este endpoint NO es llamado por tu frontend!
 *
 * @query {string} interact_ref - Referencia de la interacción.
 * @query {string} hash - Hash de verificación (que usaremos con el nonce).
 */
app.get('/api/payment-callback', async (req, res) => {
  // --- URLs de tu frontend (¡ajusta esto a tu app!) ---
  const FRONTEND_SUCCESS_URL = 'http://localhost:5173/payment-success';
  const FRONTEND_ERROR_URL = 'http://localhost:5173/payment-error';
  // ---

  try {
    const { interact_ref, hash } = req.query;

    if (!interact_ref || !hash) {
      throw new Error("Callback inválido. Faltan 'interact_ref' o 'hash'.");
    }

    // 1. OBTENER DATOS DE LA SESIÓN
    // @ts-ignore
    const details = req.session.paymentDetails;

    if (!details || !details.continueToken || !details.continueUri || !details.quoteId || !details.payerCredentials) {
      throw new Error("Sesión de pago no encontrada o expirada. Por favor, intenta el pago de nuevo.");
    }
    
    // 2. ¡LIMPIAR LA SESIÓN INMEDIATAMENTE!
    // Esto previene que el callback se pueda re-usar (ataque de repetición).
    // @ts-ignore
    req.session.paymentDetails = null;

    // (Aquí es donde verificarías que el 'hash' coincide con el 'details.nonce'
    // para máxima seguridad, pero lo omitimos por simplicidad del hackathon)
    console.log(`Callback recibido. Continuando grant con interact_ref: ${interact_ref}`);

    // 3. RE-CREAR EL CLIENTE con las credenciales del pagador (guardadas en la sesión)
    const { keyId, privateKeyBase64, walletAddressUrl } = details.payerCredentials;
    const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

    const client = await createAuthenticatedClient({
      keyId: keyId,
      privateKey: privateKey,
      walletAddressUrl: walletAddressUrl
    });

    // 4. CONTINUAR EL GRANT para obtener el token final
    console.log("Continuando el grant para obtener el token final...");
    const finalGrant = await client.grant.continue(
      {
        accessToken: details.continueToken,
        url: details.continueUri,
      },
      {
        interact_ref: interact_ref as string,
      },
    );

    if (!isFinalizedGrant(finalGrant)) {
      throw new Error("Se esperaba un grant finalizado, pero sigue pendiente.");
    }

    console.log("¡Grant finalizado! Creando el pago saliente...");

    // 5. ¡ENVIAR EL PAGO!
    // Usamos el token final y el quoteId (de la sesión)
    const payerWalletAddress = await client.walletAddress.get({
      url: walletAddressUrl,
    });

    const payment = await client.outgoingPayment.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: finalGrant.access_token.value, // ¡El token final!
      },
      {
        walletAddress: payerWalletAddress.id,
        quoteId: details.quoteId, // El ID de la cotización que iniciamos
      }
    );

    console.log("¡PAGO ENVIADO EXITOSAMENTE!", payment);

    // 6. REDIRIGIR AL FRONTEND (ÉXITO)
    // Enviamos el ID del pago (o el ID del 'outgoingPayment') a la URL de éxito
    const successUrl = new URL(FRONTEND_SUCCESS_URL);
    successUrl.searchParams.append('paymentId', payment.id);
    res.redirect(successUrl.toString());

  } catch (error) {
    console.error("Error grave en /api/payment-callback:", error);
    
    // 7. REDIRIGIR AL FRONTEND (ERROR)
    const errorUrl = new URL(FRONTEND_ERROR_URL);
    errorUrl.searchParams.append('message', error.message || 'Error desconocido');
    res.redirect(errorUrl.toString());
  }
});

// ================================================================
// === INICIAR SERVIDOR ===========================================
// ================================================================

app.listen(port, () => {
  console.log(`Servidor P2P escuchando en http://localhost:${port}`);
});
