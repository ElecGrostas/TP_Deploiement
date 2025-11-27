const ModbusRTU = require("modbus-serial");

/**
 * Lit un registre Modbus sur un automate via Modbus TCP.
 *
 * @param {string} automateIp       IP de l'automate (ex: "192.168.0.10")
 * @param {number} registerAddress  Adresse du registre (en entier, ex: 1, 2, 10)
 * @param {string} registerType     "holding" | "input" | "coil" | "discrete"
 * @returns {Promise<number|null>}  Valeur lue ou null en cas d'erreur
 */
async function readRegister(automateIp, registerAddress, registerType) {
  const client = new ModbusRTU();

  try {
    client.setTimeout(1500);

    // Connexion Modbus TCP (port classique 502)
    await client.connectTCP(automateIp, { port: 502 });

    // Esclave Modbus (ID) : souvent 1 par défaut
    client.setID(1);

    const addr = Number(registerAddress);

    let data;

    switch (registerType) {
      case "holding":
        // 1 registre holding
        data = await client.readHoldingRegisters(addr, 1);
        return data.data[0];

      case "input":
        // 1 registre input
        data = await client.readInputRegisters(addr, 1);
        return data.data[0];

      case "coil":
        // 1 coil → bool → on renvoie 0/1
        data = await client.readCoils(addr, 1);
        return data.data[0] ? 1 : 0;

      case "discrete":
        // 1 entrée discrète → bool → 0/1
        data = await client.readDiscreteInputs(addr, 1);
        return data.data[0] ? 1 : 0;

      default:
        throw new Error("Invalid register type: " + registerType);
    }

  } catch (err) {
    console.error(
      `[Modbus] Erreur lecture automate ${automateIp}, registre ${registerAddress} (${registerType}) :`,
      err.message
    );
    return null;
  } finally {
    try {
      client.close();
    } catch (_) {}
  }
}

module.exports = { readRegister };
