// Örnek veriler: çalışanlar, ürünler, mal girişleri ve reçeteler.
export function seedSampleData(s) {
  const emp = Object.fromEntries([
    ['ahmet', 'Ahmet Yılmaz', 'depo'],
    ['mehmet', 'Mehmet Kaya', 'depo'],
    ['ayse', 'Ayşe Demir', 'mutfak'],
    ['hasan', 'Hasan Usta', 'mutfak'],
    ['zeynep', 'Zeynep Arslan', 'muhasebe'],
    ['nova', 'Nova', 'yonetici'],
  ].map(([k, name, role]) => [k, s.createEmployee({ name, role })]));

  const p = Object.fromEntries([
    ['et', 'Dana kuşbaşı', 'kg', 'Et', 20],
    ['kiyma', 'Dana kıyma', 'kg', 'Et', 15],
    ['tavuk', 'Tavuk göğsü', 'kg', 'Et', 20],
    ['domates', 'Domates', 'kg', 'Sebze', 30],
    ['biber', 'Sivri biber', 'kg', 'Sebze', 15],
    ['sogan', 'Kuru soğan', 'kg', 'Sebze', 20],
    ['patates', 'Patates', 'kg', 'Sebze', 30],
    ['patlican', 'Patlıcan', 'kg', 'Sebze', 15],
    ['marul', 'Marul', 'adet', 'Sebze', 20],
    ['salatalik', 'Salatalık', 'kg', 'Sebze', 10],
    ['limon', 'Limon', 'kg', 'Sebze', 5],
    ['salca', 'Domates salçası', 'kg', 'Bakliyat', 5],
    ['pirinc', 'Baldo pirinç', 'kg', 'Bakliyat', 25],
    ['bulgur', 'Pilavlık bulgur', 'kg', 'Bakliyat', 20],
    ['mercimek', 'Kırmızı mercimek', 'kg', 'Bakliyat', 15],
    ['nohut', 'Nohut', 'kg', 'Bakliyat', 15],
    ['un', 'Un', 'kg', 'Bakliyat', 20],
    ['yag', 'Ayçiçek yağı', 'lt', 'Yağ', 10],
    ['zeytinyagi', 'Zeytinyağı', 'lt', 'Yağ', 5],
    ['tereyag', 'Tereyağı', 'kg', 'Süt ürünleri', 5],
    ['yogurt', 'Yoğurt', 'kg', 'Süt ürünleri', 20],
    ['sut', 'Süt', 'lt', 'Süt ürünleri', 20],
    ['yumurta', 'Yumurta', 'adet', 'Süt ürünleri', 120],
    ['seker', 'Toz şeker', 'kg', 'Bakliyat', 10],
    ['tuz', 'Tuz', 'kg', 'Baharat', 3],
  ].map(([key, name, unit, category, min_stock]) => [key, s.createProduct({ name, unit, category, min_stock })]));

  const intake = (employee, supplier, document_no, rows) => s.createIntake({
    employee_id: employee.id, supplier, document_no,
    items: rows.map(([k, quantity, unit_price]) => ({ product_id: p[k].id, quantity, unit_price })),
  });
  intake(emp.ahmet, 'Anadolu Et Gıda', 'IRS-1001', [['et', 60, 520], ['kiyma', 40, 480], ['tavuk', 50, 190]]);
  intake(emp.ahmet, 'Yeşil Bahçe Sebze', 'IRS-1002', [
    ['domates', 80, 28], ['biber', 40, 45], ['sogan', 50, 18], ['patates', 80, 15], ['patlican', 30, 35],
    ['marul', 60, 20], ['salatalik', 25, 30], ['limon', 10, 40]]);
  intake(emp.mehmet, 'Toros Bakliyat', 'IRS-1003', [
    ['pirinc', 100, 65], ['bulgur', 60, 38], ['mercimek', 40, 55], ['nohut', 40, 60], ['un', 50, 22],
    ['seker', 30, 35], ['tuz', 10, 12], ['salca', 15, 90]]);
  intake(emp.mehmet, 'Ege Yağ ve Süt', 'IRS-1004', [
    ['yag', 40, 70], ['zeytinyagi', 15, 320], ['tereyag', 10, 380], ['yogurt', 40, 60], ['sut', 40, 32], ['yumurta', 360, 4.5]]);

  // Miktarlar "yield_portions" kişilik içindir.
  const recipe = (name, yield_portions, notes, items) => s.saveRecipe(null, {
    name, yield_portions, notes,
    items: items.map(([k, quantity, unit]) => ({ product_id: p[k].id, quantity, unit })),
  });
  recipe('Saç kavurma', 10, 'Kişi başı 150 g et', [
    ['et', 1.5, 'kg'], ['domates', 1, 'kg'], ['biber', 0.5, 'kg'], ['sogan', 300, 'g'], ['yag', 100, 'ml'], ['tuz', 20, 'g']]);
  recipe('Tereyağlı pirinç pilavı', 10, null, [
    ['pirinc', 800, 'g'], ['tereyag', 100, 'g'], ['tuz', 15, 'g']]);
  recipe('Bulgur pilavı', 10, null, [
    ['bulgur', 800, 'g'], ['sogan', 150, 'g'], ['salca', 50, 'g'], ['yag', 80, 'ml'], ['tuz', 15, 'g']]);
  recipe('Mercimek çorbası', 10, 'Kase başı 250 ml', [
    ['mercimek', 500, 'g'], ['sogan', 150, 'g'], ['un', 30, 'g'], ['tereyag', 50, 'g'], ['salca', 30, 'g'], ['tuz', 20, 'g'], ['limon', 100, 'g']]);
  recipe('Nohut yemeği', 10, null, [
    ['nohut', 700, 'g'], ['sogan', 200, 'g'], ['salca', 80, 'g'], ['yag', 100, 'ml'], ['tuz', 15, 'g']]);
  recipe('Tavuk sote', 10, 'Kişi başı 150 g tavuk', [
    ['tavuk', 1.5, 'kg'], ['biber', 400, 'g'], ['domates', 500, 'g'], ['sogan', 200, 'g'], ['yag', 80, 'ml'], ['tuz', 15, 'g']]);
  recipe('Karnıyarık', 10, null, [
    ['patlican', 2, 'kg'], ['kiyma', 800, 'g'], ['sogan', 300, 'g'], ['domates', 500, 'g'], ['biber', 300, 'g'], ['yag', 300, 'ml'], ['tuz', 20, 'g']]);
  recipe('İzmir köfte', 10, null, [
    ['kiyma', 1.2, 'kg'], ['patates', 1.5, 'kg'], ['domates', 600, 'g'], ['biber', 300, 'g'], ['salca', 50, 'g'], ['yumurta', 2, 'adet'], ['tuz', 20, 'g']]);
  recipe('Mevsim salata', 10, null, [
    ['marul', 3, 'adet'], ['domates', 600, 'g'], ['salatalik', 500, 'g'], ['limon', 100, 'g'], ['zeytinyagi', 100, 'ml'], ['tuz', 10, 'g']]);
  recipe('Cacık', 10, null, [
    ['yogurt', 1.5, 'kg'], ['salatalik', 600, 'g'], ['zeytinyagi', 30, 'ml'], ['tuz', 10, 'g']]);
  recipe('Sütlaç', 10, null, [
    ['sut', 2, 'lt'], ['pirinc', 150, 'g'], ['seker', 300, 'g'], ['un', 40, 'g']]);

  // Bugünden örnek bir üretim
  s.createProduction({ recipe_id: s.listRecipes().find((r) => r.name === 'Mercimek çorbası').id, portions: 150, employee_id: emp.ayse.id });
}
