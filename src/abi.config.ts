export default [
  'function register(uint256 starkKey, bytes calldata signature) external',
  'function deposit(uint256 tokenId, uint256 vaultId, uint256 quantizedAmount) public',
  'function depositCancel( uint256 tokenId, uint256 vaultId) external',
  'function depositReclaim(uint256 tokenId, uint256 vaultId) external',
  'function withdraw(uint256 tokenId) external',
  'function fullWithdrawalRequest(uint256 vaultId) external',
  'function freezeRequest(uint256 vaultId) external',
  'function verifyEscape(uint256[] calldata escapeProof) external',
  'function escape(uint256 starkKey, uint256 vaultId, uint256 tokenId, uint256 quantizedAmount) external',
];
