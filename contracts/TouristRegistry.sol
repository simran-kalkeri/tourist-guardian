// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TouristRegistry {
    address public admin;
    uint public touristCount = 0;
    
    struct Tourist {
        uint id;
        string name;
        string aadharOrPassport;
        uint256 tripStart;
        uint256 tripEnd;
        string emergencyContact;
        bool isRegistered;
        bool sosActive;
        int256 latitude;
        int256 longitude;
    }

    mapping(uint => Tourist) public tourists;
    mapping(address => uint) public touristByWallet;
    
    event TouristRegistered(uint id, string name, uint256 tripStart, uint256 tripEnd);
    event LocationUpdated(uint id, int256 latitude, int256 longitude);
    event SOSTriggered(uint id);
    
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
    
    function registerTourist(
        string memory _name,
        string memory _aadharOrPassport,
        uint256 _tripStart,
        uint256 _tripEnd,
        string memory _emergencyContact
    ) public returns (uint) {
        touristCount++;
        tourists[touristCount] = Tourist({
            id: touristCount,
            name: _name,
            aadharOrPassport: _aadharOrPassport,
            tripStart: _tripStart,
            tripEnd: _tripEnd,
            emergencyContact: _emergencyContact,
            isRegistered: true,
            sosActive: false,
            latitude: 0,
            longitude: 0
        });
        
        touristByWallet[msg.sender] = touristCount;
        emit TouristRegistered(touristCount, _name, _tripStart, _tripEnd);
        return touristCount;
    }
    
    function updateLocation(uint _id, int256 _lat, int256 _long) public onlyRegistered(_id) {
        tourists[_id].latitude = _lat;
        tourists[_id].longitude = _long;
        emit LocationUpdated(_id, _lat, _long);
    }
    
    function triggerSOS(uint _id) public onlyRegistered(_id) {
        tourists[_id].sosActive = true;
        emit SOSTriggered(_id);
    }
    
    function resetSOS(uint _id) public onlyAdmin onlyRegistered(_id) {
        tourists[_id].sosActive = false;
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
        delete tourists[_id];
    }
}
