// backend/server.js

// 1. Cargar variables de entorno
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Modality } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');

// 2. Inicializar servicios
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Permite peticiones desde otros dominios (tu frontend)
app.use(express.json({ limit: '10mb' })); // Permite recibir JSON grandes (para las imágenes)

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializar Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Crear el endpoint principal /api/remodel
app.post('/api/remodel', async (req, res) => {
    // La lógica de este endpoint la llenaremos en el siguiente paso
    // Por ahora, solo es una estructura.
    
    // Obtener los datos de la petición del frontend
    const remodelOptions = req.body;
    
    // NOTA: En una aplicación real, aquí verificarías la autenticación del usuario.
    // Por ahora, asumiremos que se descuenta a un usuario fijo o se confía en el frontend.
    // Una implementación real usaría JWTs para identificar al usuario de forma segura.

    try {
        // Aquí iría la lógica para verificar y descontar créditos en Supabase
        
        console.log("Generando imagen con Gemini...");

        // Esta lógica es casi idéntica a la que tenías en el frontend
        const prompt = constructPrompt(remodelOptions); // Necesitaremos esta función
        const { base64ImageData, mimeType, customItems = [], remodelMode, maskBase64Data } = remodelOptions;

        const parts = [
            { inlineData: { data: base64ImageData, mimeType: mimeType } }
        ];

        if (remodelMode === 'inpainting' && maskBase64Data) {
            parts.push({ inlineData: { data: maskBase64Data.split(',')[1], mimeType: 'image/png' }});
        } else if (remodelMode === 'custom') {
            for (const item of customItems) {
                parts.push({ inlineData: { data: item.dataUrl.split(',')[1], mimeType: item.mimeType }});
                parts.push({ text: `This is a user-provided item. Category: ${item.category}. Name: "${item.name}".` });
            }
        }
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                // Devolvemos la imagen al frontend
                return res.status(200).json({ imageData: part.inlineData.data });
            }
        }

        throw new Error("API did not return an image.");

    } catch (error) {
        console.error("Error en /api/remodel:", error);
        res.status(500).json({ error: "Failed to generate image on the server." });
    }
});

// Función para construir el prompt (cópiala desde tu archivo geminiService.ts)
// ¡Asegúrate de copiar la función constructPrompt completa aquí!
function constructPrompt(/*... argumentos ...*/) {
    // ... Pega aquí el código EXACTO de tu función constructPrompt de services/geminiService.ts
    // No es necesario cambiar nada dentro de ella.
    const {
      remodelMode, roomType, remodelingType, decorStyle, materials,
      lighting, customItems, customPrompt, inpaintingPrompt,
    } = arguments[0];
    
    const basePrompt = `
**PRIMARY OBJECTIVE:** Perform an interior redesign on the provided image while maintaining 100% fidelity to the original architectural structure and camera framing.
**ROOM CONTEXT:** The user has identified this room as a "${roomType}". All design choices MUST be appropriate for this type of space.
... (resto del prompt, cópialo completo) ...
`;
    // ...
    // Devuelve el prompt como lo hacía antes
    // return `${basePrompt}\n\n**USER REQUEST:**${userRequest}\n\n${finalCheck}`;
    // --- Para ahorrar espacio en la respuesta, lo he abreviado, pero debes pegarlo completo ---
    return "
import { RemodelingType, DecorStyle, Material, Lighting, CustomItem, RemodelMode, RoomType } from '../types';

// La URL de tu backend. Para desarrollo local, será localhost.
// Cuando lo despliegues, tendrás que cambiarla por la URL de producción (ej: https://tu-backend.vercel.app)
const BACKEND_URL = '/api'; 

interface MaterialSelections {
  wall: Material;
  floor: Material;
  ceiling: Material;
}

interface RemodelOptions {
  base64ImageData: string;
  mimeType: string;
  roomType: RoomType;
  lighting: Lighting;
  remodelMode: RemodelMode;
  // Style mode
  remodelingType?: RemodelingType;
  decorStyle?: DecorStyle;
  materials?: MaterialSelections;
  // Custom mode
  customItems?: CustomItem[];
  customPrompt?: string;
  // Inpainting mode
  inpaintingPrompt?: string;
  maskBase64Data?: string;
}

// Ya no necesitamos la función constructPrompt aquí, se ha movido al backend.
// Tampoco necesitamos getAiClient ni la inicialización de GoogleGenAI.

export const remodelImage = async (options: RemodelOptions): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/remodel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Enviamos todas las opciones al backend en el cuerpo de la petición.
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      // Si el backend devuelve un error, lo capturamos.
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.imageData) {
        throw new Error("Backend did not return image data.");
    }

    // El backend nos devuelve directamente la data de la imagen en base64.
    return result.imageData;

  } catch (error) {
    console.error("Error calling backend remodel service:", error);
    // Re-lanzamos el error para que el componente que llama (MainApp.tsx) pueda manejarlo.
    throw error;
  }
};";
}


// 4. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});