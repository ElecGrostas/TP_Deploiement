// ⚠️ Version simulée : renvoie une valeur random.
// Remplacer plus tard par modbus-serial ou lib équivalente.

exports.readRegister = async (ip, registerAddress, registerType) => {
  // simulation basique
  const noise = Math.random() * 5;
  return 20 + noise;
};
