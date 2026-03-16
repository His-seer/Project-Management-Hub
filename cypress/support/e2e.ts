// Cypress support file - global hooks & custom commands
Cypress.on('uncaught:exception', () => {
  // Prevent Cypress from failing on app-level JS errors during tests
  return false;
});
