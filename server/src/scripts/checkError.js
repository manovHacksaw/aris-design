
const { keccak256 } = require('js-sha3');

const errors = [
    'PoolAlreadyExists()',
    'PoolNotActive()',
    'PoolNotFound()',
    'PoolNotFinalized()',
    'TopPoolTooSmall()',
    'InvalidEventType()',
    'NotBrandOwner()',
    'HasClaims()',
    'ZeroAddress()',
    'InvalidAmount()',
    'NoRewardsToClaim()',
    'RefundAlreadyClaimed()',
    'InsufficientPoolBalance()'
];

console.log('Searching for 0x73380d99...');

errors.forEach(err => {
    const hash = '0x' + keccak256(err).substring(0, 8);
    console.log(`${err}: ${hash}`);
    if (hash === '0x73380d99') {
        console.log(`MATCH FOUND: ${err}`);
    }
});
