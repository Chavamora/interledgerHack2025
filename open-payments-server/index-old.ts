import express from 'express';
// Import the client and error handler
import {
  createUnauthenticatedClient,
  OpenPaymentsClientError,
createAuthenticatedClient,
  isPendingGrant,
  isFinalizedGrant
} from '@interledger/open-payments';
import { v4 as uuid } from 'uuid'; // Necesitarás 'uuid' para el 'nonce'

const app = express();
const port = 3000;
app.use(express.json());

const QUOTE_ID_FROM_PREVIOUS_STEP="https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c/quotes/ebb9819a-2583-4f8d-bf31-cd5c643e9d69"

let pendingGrantDetails = {
  continueToken: "",
  continueUri: "",
  nonce: ""
};
app.get('/', (req, res) => {
  res.send('Hola mundo ola Open Payments Server is running!');
});

const RECIPIENT_BILL_URL = "https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c/incoming-payments/88c72afd-8422-4aac-9b44-86b3a3d3caa7";

// --- CREDENCIALES DEL PAGADOR ---
// ¡Este es un usuario NUEVO! Es el comprador.
// (Son credenciales de ejemplo, tendrías que crear otra billetera de prueba)
const PAYER_WALLET_URL = "https://ilp.interledger-test.dev/usd123123";
const PAYER_KEY_ID = "9ef9a49d-4ef0-4baf-b938-285d41d596e7";
const PAYER_BASE64_KEY = "MC4CAQAwBQYDK2VwBCIEIGzcyxiaY+PJ0qOgAfjQX/q22vdX5TI+MY0wPAJ1xUgz"; 
// ---

const payerPrivateKey = `-----BEGIN PRIVATE KEY-----\n${PAYER_BASE64_KEY}\n-----END PRIVATE KEY-----`;

app.get('/payer-start-payment', async (req, res) => {
  try {
    const client = await createAuthenticatedClient({
      keyId: PAYER_KEY_ID,
      privateKey: payerPrivateKey,
      walletAddressUrl: PAYER_WALLET_URL
    });

    const payerWalletAddress = await client.walletAddress.get({
      url: PAYER_WALLET_URL,
    });
    
    const nonce = uuid(); // Un valor único para seguridad

    console.log("Requesting INTERACTIVE grant for outgoing payment...");
    
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
                quoteId: QUOTE_ID_FROM_PREVIOUS_STEP
              },
            },
          ],
        },
        interact: {
          start: ["redirect"],
          finish: {
            method: "redirect",
            uri: "http://localhost:3000/payer-payment-approved",
            nonce: nonce,
          },
        },
      },
    );

    if (!isPendingGrant(grant)) {
      throw new Error("Expected interactive grant, but received a non-pending grant.");
    }

    // Guardamos los detalles del grant PENDIENTE en nuestras variables globales
    pendingGrantDetails.continueToken = grant.continue.access_token.value;
    pendingGrantDetails.continueUri = grant.continue.uri;
    pendingGrantDetails.nonce = nonce;
    // ---

    console.log("Grant is pending. User must interact at this URL:");
    console.log(grant.interact.redirect);
    
    res.json({
      message: "Grant pending. Please redirect user to this URL.",
      redirectTo: grant.interact.redirect
    });

  } catch (error) {
    console.error("Error in /payer-start-payment route:", error); 
    res.status(error.status || 500).send(error.description || error.message);
  }
});

const CONTINUE_ACCESS_TOKEN = "9F694F9A4E7A1C200DCB";
const CONTINUE_URI = "https://auth.interledger-test.dev/continue/7a421685-3e28-4e4b-84a5-961d156c4297";
app.get('/payer-payment-approved', async (req, res) => {
  try {
    const { interact_ref, hash } = req.query;

    if (!interact_ref) {
      return res.status(400).send("Missing 'interact_ref' query parameter");
    }

    // Verificamos que tengamos detalles de un grant PENDIENTE
    if (!pendingGrantDetails.continueToken || !pendingGrantDetails.continueUri) {
      return res.status(400).send("No pending grant found. Please start the payment process again via /payer-start-payment.");
    }
    
    // (Aquí deberías verificar el 'hash' usando 'pendingGrantDetails.nonce',
    // pero lo omitiremos por simplicidad)

    console.log(`Received interaction reference: ${interact_ref}`);

    const client = await createAuthenticatedClient({
      keyId: PAYER_KEY_ID,
      privateKey: payerPrivateKey,
      walletAddressUrl: PAYER_WALLET_URL
    });
    
    console.log("Continuing the grant to get final token...");
    
    // ¡Usamos los valores de las variables globales!
    const finalGrant = await client.grant.continue(
      {
        accessToken: pendingGrantDetails.continueToken,
        url: pendingGrantDetails.continueUri,
      },
      {
        interact_ref: interact_ref as string,
      },
    );
    
    // Limpiamos las variables globales, ya que el grant fue usado
    pendingGrantDetails = { continueToken: "", continueUri: "", nonce: "" };

    if (!isFinalizedGrant(finalGrant)) {
      throw new Error("Expected finalized grant, but it is still pending.");
    }
    
    console.log("Grant finalized! Received final OUTGOING_PAYMENT_ACCESS_TOKEN.");

    // --- CREAR PAGO SALIENTE (Sin cambios) ---
    console.log("Using final token to create outgoing payment...");
    const payerWalletAddress = await client.walletAddress.get({
      url: PAYER_WALLET_URL,
    });
    
    const payment = await client.outgoingPayment.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: finalGrant.access_token.value,
      },
      {
        walletAddress: payerWalletAddress.id,
        quoteId: QUOTE_ID_FROM_PREVIOUS_STEP,
      }
    );

    console.log("PAYMENT SENT SUCCESSFULLY!", payment);
    res.json({
      message: "Payment successful!",
      paymentSent: payment
    });

  } catch (error) {
    console.error("Error in /payer-payment-approved route:", error); 
    res.status(error.status || 500).send(error.description || error.message);
  }
});
//first in the flow
app.get('/get-grant', async (req, res) => {
  const base64Key = "MC4CAQAwBQYDK2VwBCIEIHd9fP9bHIvJELWYyRl7mBH+5ZpFZ2SxMdJXOe1faKnU";
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${base64Key}\n-----END PRIVATE KEY-----`;

  try {
    const client = await createAuthenticatedClient({
      keyId: '47fca825-9754-4cc9-86ab-03326bbdc60a',
      privateKey: privateKey,
      walletAddressUrl: 'https://ilp.interledger-test.dev/hola12321321'
    });

    const walletAddress = await client.walletAddress.get({
      url: 'https://ilp.interledger-test.dev/hola12321321',
    });

    console.debug('walletAddress: ', walletAddress);

    const grant = await client.grant.request(
      {
        url: walletAddress.authServer,
      },
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
      throw new Error("Expected non-interactive grant");
    }

    console.log("Successfully obtained grant!");

    // Ahora usamos el token de acceso del grant para
    // crear el recurso de pago entrante.

    console.log("Creating incoming payment...");
    
    // 1. Definimos los detalles de la factura que queremos crear
    const paymentDetails = {
      walletAddress: walletAddress.id, // A qué billetera debe llegar el pago
      incomingAmount: {
        value: "1000", // 1000 centavos
        assetCode: "CAD",  // ¡Importante! Tu billetera usa CAD, no USD
        assetScale: 2      // 2 decimales (1000 centavos = 10.00 CAD)
      },
      // Expira en 10 minutos
      expiresAt: new Date(Date.now() + 60_000 * 10).toISOString(),
    };

    // 2. Creamos el pago
    const incomingPayment = await client.incomingPayment.create(
      {
        // Usamos la URL del servidor de recursos de nuestra billetera
        url: walletAddress.resourceServer, 
        // ¡Pasamos el token que acabamos de obtener!
        accessToken: grant.access_token.value 
      },
      paymentDetails // Los detalles de la factura
    );
    
    console.log("Successfully created incoming payment:", incomingPayment);

    // Enviamos el pago creado como respuesta
    res.json({ incomingPayment });

  } catch (error) {
    console.error("Error in /test route. Full error object:");
    console.error(error); 
    
    if (error.status) {
      console.error("Underlying HTTP Status:", error.status);
    }
    if (error.description) {
        console.error("Underlying Error Description:", error.description);
    }

    res.status(error.status || 500).send(error.description || error.message);
  }
});

app.get('/payer-create-quote', async (req, res) => {
  try {
    // 1. INICIALIZAR EL CLIENTE
    const client = await createAuthenticatedClient({
      keyId: PAYER_KEY_ID,
      privateKey: payerPrivateKey,
      walletAddressUrl: PAYER_WALLET_URL
    });

    const payerWalletAddress = await client.walletAddress.get({
      url: PAYER_WALLET_URL,
    });
    console.log("Payer's Wallet:", payerWalletAddress);

    // 2. PEDIR EL GRANT PARA "QUOTE"
    console.log("Requesting quote grant...");
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

    // 3. VERIFICAR EL GRANT
    if (isPendingGrant(quoteGrant)) {
      throw new Error("Expected non-interactive grant for quote");
    }
    console.log("Successfully obtained quote grant!");

    // 4. CREAR LA COTIZACIÓN
    console.log("Creating the quote...");
    const quote = await client.quote.create(
      {
        url: payerWalletAddress.resourceServer, 
        accessToken: quoteGrant.access_token.value 
      },
      {
        walletAddress: payerWalletAddress.id, // Nuestra billetera
        receiver: RECIPIENT_BILL_URL,       // La factura del VENDEDOR
        
        method: "ilp" // Especificamos que queremos una cotización para un pago ILP
      }
    );

    console.log("Successfully created quote:", quote);
    res.json({ quote });

  } catch (error) {
    console.error("Error in /payer-create-quote route:", error); 
    if (error.status) {
      console.error("Underlying HTTP Status:", error.status);
    }
    if (error.description) {
        console.error("Underlying Error Description:", error.description);
    }
    res.status(error.status || 500).send(error.description || error.message);
  }
});

// --- ¡LA FACTURA QUE PAGARON! ---
const INCOMING_PAYMENT_ID_TO_CHECK = "https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c/incoming-payments/32ef086f-b926-4351-8eb1-d5756b4753fa";
app.get('/beneficiary-check-payment', async (req, res) => {
  // Cambié '...fP9b...' de nuevo a '...f9bH...'
  const base64Key = "MC4CAQAwBQYDK2VwBCIEIHd9fP9bHIvJELWYyRl7mBH+5ZpFZ2SxMdJXOe1faKnU";
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${base64Key}\n-----END PRIVATE KEY-----`;

  try {
    const client = await createAuthenticatedClient({
      keyId: '47fca825-9754-4cc9-86ab-03326bbdc60a',
      privateKey: privateKey,
      walletAddressUrl: 'https://ilp.interledger-test.dev/hola12321321'
    });

    const beneficiaryWalletAddress = await client.walletAddress.get({
      url: 'https://ilp.interledger-test.dev/hola12321321',
    });

    // 2. OBTENER UN GRANT DE SOLO LECTURA
    console.log("Getting read-only grant for incoming payments...");
    const grant = await client.grant.request(
      {
        url: beneficiaryWalletAddress.authServer,
      },
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
      throw new Error("Expected non-interactive grant for reading");
    }
    console.log("Got read grant!");

    // 3. USAR EL GRANT PARA OBTENER EL ESTADO DEL PAGO
    console.log(`Fetching payment status for: ${INCOMING_PAYMENT_ID_TO_CHECK}`);
    const paymentStatus = await client.incomingPayment.get(
      {
        url: INCOMING_PAYMENT_ID_TO_CHECK, // La URL de la factura
        accessToken: grant.access_token.value // El token de lectura
      }
    );

    console.log("Payment status retrieved!", paymentStatus);

    // 4. ENVIAR EL RESULTADO
    res.json({
      message: "Payment status retrieved successfully!",
      paymentStatus: paymentStatus
    });

  } catch (error) {
    console.error("Error in /beneficiary-check-payment route:", error);
    // Añadí un log del 'details' para ver mejor los errores 401
    if (error.details) {
      console.error("Error details:", error.details);
    }
    res.status(error.status || 500).send(error.description || error.message);
  }
});
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
