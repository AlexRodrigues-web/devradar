import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

const algorithm = "scrypt";
const keyLength = 64;
const cost = 16384;
const blockSize = 8;
const parallelization = 1;

export function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("A password must have at least 8 characters.");
  }

  if (password.length > 200) {
    throw new Error("A password is too long.");
  }
}

export async function hashPassword(password: string) {
  validatePassword(password);

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: 64 * 1024 * 1024
  })) as Buffer;

  return [algorithm, cost, blockSize, parallelization, salt, derivedKey.toString("hex")].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");

  if (parts.length !== 6) {
    return false;
  }

  const [storedAlgorithm, storedCost, storedBlockSize, storedParallelization, salt, hash] = parts;

  if (storedAlgorithm !== algorithm) {
    return false;
  }

  const storedBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== keyLength) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, keyLength, {
    N: Number(storedCost),
    r: Number(storedBlockSize),
    p: Number(storedParallelization),
    maxmem: 64 * 1024 * 1024
  })) as Buffer;

  return timingSafeEqual(derivedKey, storedBuffer);
}
