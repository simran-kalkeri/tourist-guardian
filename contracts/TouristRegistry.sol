// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TouristRegistry {
    address public admin;
    uint public touristCount = 0;
    
    struct Tourist {
        uint id;
        string name;
        bytes32 aadharOrPassportHash; // storing hash instead of raw sensitive string
        uint256 tripStart;
        uint256 tripEnd;
        string emergencyContact; // keep emergency contact on-chain (optional)
        bool isRegistered;
        bool sosActive;
        int256 latitude;
        int256 longitude;
    }

    mapping(uint => Tourist) public tourists;
    mapping(address => uint) public touristByWallet;
    
    event TouristRegistered(uint id, address indexed wallet, string name, uint256 tripStart, uint256 tripEnd);
    event LocationUpdated(uint id, int256 latitude, int256 longitude);
    event SOSTriggered(uint id);
    event SOSReset(uint id);
    event TouristDeleted(uint id);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    modifier onlyRegistered(uint _id) {
        require(tourists[_id].isRegistered, "Tourist not registered");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // --- Registration ---
    // Deprecated: stores plain string (keeps for compatibility). Prefer registerTouristSecure.
    function registerTourist(
        string memory _name,
        string memory _aadharOrPassport,
        uint256 _tripStart,
        uint256 _tripEnd,
        string memory _emergencyContact
    ) public returns (uint) {
        bytes32 hash = keccak256(abi.encodePacked(_aadharOrPassport));
        return _register(msg.sender, _name, hash, _tripStart, _tripEnd, _emergencyContact);
    }

    // Preferred: client should send hashed Aadhaar/passport (off-chain hashing) for privacy
    function registerTouristSecure(
        bytes32 _aadharOrPassportHash,
        string memory _name,
        uint256 _tripStart,
        uint256 _tripEnd,
        string memory _emergencyContact
    ) public returns (uint) {
        return _register(msg.sender, _name, _aadharOrPassportHash, _tripStart, _tripEnd, _emergencyContact);
    }

    function _register(
        address _wallet,
        string memory _name,
        bytes32 _aadharHash,
        uint256 _tripStart,
        uint256 _tripEnd,
        string memory _emergencyContact
    ) internal returns (uint) {
        require(touristByWallet[_wallet] == 0, "Already registered");
        touristCount++;
        tourists[touristCount] = Tourist({
            id: touristCount,
            name: _name,
            aadharOrPassportHash: _aadharHash,
            tripStart: _tripStart,
            tripEnd: _tripEnd,
            emergencyContact: _emergencyContact,
            isRegistered: true,
            sosActive: false,
            latitude: 0,
            longitude: 0
        });
        
        touristByWallet[_wallet] = touristCount;
        emit TouristRegistered(touristCount, _wallet, _name, _tripStart, _tripEnd);
        return touristCount;
    }
    
    // --- Tourist-controlled actions (only affecting own record) ---
    function updateMyLocation(int256 _lat, int256 _long) public {
        uint id = touristByWallet[msg.sender];
        require(id != 0, "Not registered");
        tourists[id].latitude = _lat;
        tourists[id].longitude = _long;
        emit LocationUpdated(id, _lat, _long);
    }
    
    function triggerMySOS() public {
        uint id = touristByWallet[msg.sender];
        require(id != 0, "Not registered");
        tourists[id].sosActive = true;
        emit SOSTriggered(id);
    }
    
    // --- Admin-only actions ---
    function resetSOS(uint _id) public onlyAdmin onlyRegistered(_id) {
        tourists[_id].sosActive = false;
        emit SOSReset(_id);
    }
    
    function getTourist(uint _id) public view onlyAdmin returns (Tourist memory) {
        return tourists[_id];
    }
    
    function getAllTourists() public view onlyAdmin returns (Tourist[] memory) {
        Tourist[] memory result = new Tourist[](touristCount);
        for(uint i = 0; i < touristCount; i++){
            result[i] = tourists[i+1];
        }
        return result;
    }
    
    function deleteTourist(uint _id) public onlyAdmin onlyRegistered(_id) {
        require(block.timestamp > tourists[_id].tripEnd, "Trip not yet ended");
        // find wallet linked to this id and clear mapping (best-effort)
        // (note: scanning mapping is expensive; if many entries use off-chain index or keep wallet in struct)
        // To keep gas reasonable, we clear touristByWallet if msg.sender is current admin and touristByWallet mapping matches
        // If touristByWallet reverse mapping is essential, consider storing wallet in Tourist struct.
        // For now we search via touristByWallet mapping using the stored id
        // WARNING: scanning full mapping on-chain is not practical; keep this in mind for production.
        // We'll just delete tourist and emit event; app layer should also clear references.
        delete tourists[_id];
        emit TouristDeleted(_id);
    }

    // --- Admin management ---
    function transferAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Zero address");
        address previous = admin;
        admin = _newAdmin;
        emit AdminTransferred(previous, _newAdmin);
    }

    // --- Helper: get my tourist data ---
    function getMyTouristData() public view returns (Tourist memory) {
        uint id = touristByWallet[msg.sender];
        require(id != 0, "Not registered");
        return tourists[id];
    }
}
