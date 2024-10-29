import { describe, expect, test, jest } from "@jest/globals";
import { handleNativeBera } from './handle-native-bera';
import { beraTokenAddress, nativeTokenAddress } from '@bera/config';
import { getAddress } from 'viem';

// From .env
jest.mock('@bera/config', () => ({
  beraTokenAddress: '0x7507c1dc16935B82698e4C63f2746A2fCf994dF8',
  nativeTokenAddress: '0x0000000000000000000000000000000000000000',
}));

describe('handleNativeBera', () => {
  test('should return beraTokenAddress if tokenAddress is nativeTokenAddress', () => {
    const result = handleNativeBera(nativeTokenAddress);
    expect(result).toBe(getAddress(beraTokenAddress));
  });

  test('should return the same address if tokenAddress is not nativeTokenAddress', () => {
    const someOtherAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const result = handleNativeBera(someOtherAddress);
    expect(result).toBe(getAddress(someOtherAddress));
  });

  test('should return the input if it is not a valid address', () => {
    const invalidAddress = 'invalidAddress';
    const result = handleNativeBera(invalidAddress);
    expect(result).toBe(invalidAddress);
  });
});