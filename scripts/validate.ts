// Validate the catalogue and print a one-line summary. Exits 1 with every problem listed when anything is wrong.
import { CatalogueError, loadCatalogue } from "../src/catalogue/load";

try {
  const c = await loadCatalogue();
  console.log(`catalogue ${c.version}: ${c.components.length} components, ${c.styles.length} styles`);
} catch (error) {
  console.error(error instanceof CatalogueError ? error.message : error);
  process.exit(1);
}
