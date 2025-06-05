import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
 
export default defineConfig(async ({ mode }) => {
// Access NODE_ENV via process.env or import.meta.env (for Vite-specific vars)
const isProduction = mode === 'production';
const plugins = [
react(),
runtimeErrorOverlay(),
];
 
// Conditionally add the cartographer plugin if not in production and REPL_ID is defined
if (!isProduction && import.meta.env.VITE_REPL_ID !== undefined) {
const { cartographer } = await import('@replit/vite-plugin-cartographer');
plugins.push(cartographer());
}
 
return {
plugins,
resolve: {
alias: {
'@': path.resolve(__dirname, 'client', 'src'),
'@shared': path.resolve(__dirname, 'shared'),
'@assets': path.resolve(__dirname, 'attached_assets'),
},
},
root: path.resolve(__dirname, 'client'),
build: {
outDir: path.resolve(__dirname, 'dist/public'),
emptyOutDir: true,
},
};
});