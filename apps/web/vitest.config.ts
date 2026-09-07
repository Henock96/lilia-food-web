import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    /**
     * ⚠️ Le motif ne couvrait que `lib/` : un test écrit ailleurs — par
     * exemple à côté d'un gestionnaire de route — n'était **jamais exécuté**,
     * sans qu'aucune commande ne le signale. Un test qui ne tourne pas est
     * pire qu'un test absent : il donne la couverture sans la vérification.
     *
     * `app/` y entre pour les routes d'API (`app/api/…/route.test.ts`), qui
     * sont du code serveur ordinaire et testable comme tel. Les composants
     * restent hors périmètre : ils demanderaient un environnement DOM, que
     * cette configuration ne monte pas (`environment: 'node'`).
     */
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
