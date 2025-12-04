// backend/src/services/modbus.service.js
const ModbusRTU = require("modbus-serial");

/**
 * Crée et retourne un client Modbus connecté
 */
async function connectClient(ip) {
  const client = new ModbusRTU();
  client.setTimeout(1500);

  await client.connectTCP(ip, { port: 502 });
  client.setID(1); // ID esclave Modbus par défaut

  return client;
}

/* -------------------------------------------------------------------------- */
/*                               FC1 → readCoils                               */
/* -------------------------------------------------------------------------- */
async function readCoils(ip, addr) {
  let client = null;

  try {
    client = await connectClient(ip);
    const data = await client.readCoils(Number(addr), 1);
    return data.data[0] ? 1 : 0;
  } catch (err) {
    console.error(`[Modbus] FC1 readCoils ERR @ ${ip}/${addr} :`, err.message);
    return null;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                          FC2 → readDiscreteInputs                           */
/* -------------------------------------------------------------------------- */
async function readDiscreteInputs(ip, addr) {
  let client = null;

  try {
    client = await connectClient(ip);
    const data = await client.readDiscreteInputs(Number(addr), 1);
    return data.data[0] ? 1 : 0;
  } catch (err) {
    console.error(`[Modbus] FC2 readDiscreteInputs ERR @ ${ip}/${addr} :`, err.message);
    return null;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                       FC3 → readHoldingRegisters                            */
/* -------------------------------------------------------------------------- */
async function readHoldingRegisters(ip, addr) {
  let client = null;

  try {
    client = await connectClient(ip);
    const data = await client.readHoldingRegisters(Number(addr), 1);
    return data.data[0];
  } catch (err) {
    console.error(`[Modbus] FC3 readHoldingRegisters ERR @ ${ip}/${addr} :`, err.message);
    return null;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                         FC4 → readInputRegisters                            */
/* -------------------------------------------------------------------------- */
async function readInputRegisters(ip, addr) {
  let client = null;

  try {
    client = await connectClient(ip);
    const data = await client.readInputRegisters(Number(addr), 1);
    return data.data[0];
  } catch (err) {
    console.error(`[Modbus] FC4 readInputRegisters ERR @ ${ip}/${addr} :`, err.message);
    return null;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                               FC5 → writeCoil                               */
/* -------------------------------------------------------------------------- */
async function writeCoil(ip, addr, value) {
  let client = null;

  try {
    client = await connectClient(ip);
    await client.writeCoil(Number(addr), Boolean(value)); // FC5
    return true;
  } catch (err) {
    console.error(
      `[Modbus] FC5 writeCoil ERR @ ${ip}/${addr} value=${value} :`,
      err.message
    );
    return false;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                         FC6 → writeRegister (Holding)                       */
/* -------------------------------------------------------------------------- */
async function writeRegister(ip, addr, value) {
  let client = null;

  try {
    client = await connectClient(ip);
    await client.writeRegister(Number(addr), Number(value)); // FC6
    return true;
  } catch (err) {
    console.error(
      `[Modbus] FC6 writeRegister ERR @ ${ip}/${addr} value=${value} :`,
      err.message
    );
    return false;
  } finally {
    try { client.close(); } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                    Fonction générique readRegister (ton API)                */
/* -------------------------------------------------------------------------- */
async function readRegister(ip, addr, type) {
  switch (type) {
    case "holding":  return await readHoldingRegisters(ip, addr);
    case "input":    return await readInputRegisters(ip, addr);
    case "coil":     return await readCoils(ip, addr);
    case "discrete": return await readDiscreteInputs(ip, addr);
    default:
      console.error("[Modbus] Type de registre invalide :", type);
      return null;
  }
}

/* -------------------------------------------------------------------------- */

module.exports = {
  // Lecture
  readRegister,
  readCoils,
  readDiscreteInputs,
  readHoldingRegisters,
  readInputRegisters,

  // Écriture
  writeCoil,        // FC5
  writeRegister,    // FC6
};
