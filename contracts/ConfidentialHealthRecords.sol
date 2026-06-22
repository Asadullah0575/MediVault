// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialHealthRecords is ZamaEthereumConfig {

    struct HealthRecord {
        euint32 heartRate;
        euint32 oxygenLevel;
        euint32 glucoseLevel;
        euint32 temperature;
        uint256 timestamp;
        string  recordType;
        bool    exists;
    }

    struct Message {
        address sender;
        address receiver;
        string  content;
        uint256 timestamp;
    }

    struct ForumPost {
        string  pseudonym;
        string  condition;
        string  title;
        string  content;
        uint256 timestamp;
        address author;
    }
    struct ForumReply {
        string  pseudonym;
        bool    isDoctor;
        string  content;
        uint256 timestamp;
        uint256 postIndex;
    }

    mapping(address => HealthRecord[]) private patientRecords;
    mapping(address => mapping(address => bool)) private accessGrants;
    mapping(address => address[]) private patientDoctors;
    mapping(address => address[]) private doctorPatients;
    mapping(address => mapping(uint256 => string)) private recordMetadata;
    mapping(address => bool) private registeredDoctors;
    mapping(address => mapping(address => Message[])) private messages;
    uint256 public totalRecordsStored;

    ForumPost[] private forumPosts;

event PostCreated(uint256 indexed postIndex, string condition, uint256 timestamp);

function createPost(
    string calldata pseudonym,
    string calldata condition,
    string calldata title,
    string calldata content
) external {
    forumPosts.push(ForumPost({
        pseudonym: pseudonym,
        condition: condition,
        title: title,
        content: content,
        timestamp: block.timestamp,
        author: msg.sender
    }));
    emit PostCreated(forumPosts.length - 1, condition, block.timestamp);
}

function getPostCount() external view returns (uint256) {
    return forumPosts.length;
}


function getPost(uint256 index) external view returns (
    string memory pseudonym,
    string memory condition,
    string memory title,
    string memory content,
    uint256 timestamp
) {
    require(index < forumPosts.length, "MediVault: out of bounds");
    ForumPost storage p = forumPosts[index];
    return (p.pseudonym, p.condition, p.title, p.content, p.timestamp);

}

    ForumReply[] private forumReplies;

event ReplyCreated(uint256 indexed postIndex, uint256 replyIndex, uint256 timestamp);

function createReply(
    uint256 postIndex,
    string calldata pseudonym,
    bool isDoctor,
    string calldata content
) external {
    require(postIndex < forumPosts.length, "MediVault: post not found");
    forumReplies.push(ForumReply({
        pseudonym: pseudonym,
        isDoctor: isDoctor,
        content: content,
        timestamp: block.timestamp,
        postIndex: postIndex
    }));
    emit ReplyCreated(postIndex, forumReplies.length - 1, block.timestamp);
}

function getRepliesForPost(uint256 postIndex) external view returns (
    string[] memory pseudonyms,
    bool[] memory isDoctors,
    string[] memory contents,
    uint256[] memory timestamps
) {
    uint256 count = 0;
    for (uint256 i = 0; i < forumReplies.length; i++) {
        if (forumReplies[i].postIndex == postIndex) count++;
    }
    pseudonyms  = new string[](count);
    isDoctors   = new bool[](count);
    contents    = new string[](count);
    timestamps  = new uint256[](count);
    uint256 j = 0;
    for (uint256 i = 0; i < forumReplies.length; i++) {
        if (forumReplies[i].postIndex == postIndex) {
            pseudonyms[j]  = forumReplies[i].pseudonym;
            isDoctors[j]   = forumReplies[i].isDoctor;
            contents[j]    = forumReplies[i].content;
            timestamps[j]  = forumReplies[i].timestamp;
            j++;
        }
    }
}
    event RecordAdded(address indexed patient, uint256 indexed recordIndex, string recordType, uint256 timestamp);
    event AccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event AccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);
    event DoctorRegistered(address indexed doctor, uint256 timestamp);
    event MessageSent(address indexed sender, address indexed receiver, uint256 timestamp);

    modifier onlyPatientOrAuthorizedDoctor(address patient) {
        require(
            msg.sender == patient || accessGrants[patient][msg.sender],
            "MediVault: not authorized"
        );
        _;
    }

    function addRecord(
        externalEuint32 encHeartRate,
        externalEuint32 encOxygen,
        externalEuint32 encGlucose,
        externalEuint32 encTemp,
        bytes calldata heartProof,
        bytes calldata oxygenProof,
        bytes calldata glucoseProof,
        bytes calldata tempProof,
        string calldata recordType,
        string calldata metadata
    ) external {
        euint32 hr   = FHE.fromExternal(encHeartRate, heartProof);
        euint32 o2   = FHE.fromExternal(encOxygen,    oxygenProof);
        euint32 gluc = FHE.fromExternal(encGlucose,   glucoseProof);
        euint32 temp = FHE.fromExternal(encTemp,       tempProof);

        FHE.allowThis(hr); FHE.allowThis(o2);
        FHE.allowThis(gluc); FHE.allowThis(temp);
        FHE.allow(hr, msg.sender); FHE.allow(o2, msg.sender);
        FHE.allow(gluc, msg.sender); FHE.allow(temp, msg.sender);

        patientRecords[msg.sender].push(HealthRecord({
            heartRate: hr, oxygenLevel: o2, glucoseLevel: gluc,
            temperature: temp, timestamp: block.timestamp,
            recordType: recordType, exists: true
        }));

        uint256 idx = patientRecords[msg.sender].length - 1;
        recordMetadata[msg.sender][idx] = metadata;
        totalRecordsStored++;
        emit RecordAdded(msg.sender, idx, recordType, block.timestamp);
    }

    function grantAccess(address doctor) external {
        require(doctor != address(0), "MediVault: zero address");
        require(!accessGrants[msg.sender][doctor], "MediVault: already granted");
        accessGrants[msg.sender][doctor] = true;

        bool doctorExists = false;
        for (uint256 i = 0; i < patientDoctors[msg.sender].length; i++) {
            if (patientDoctors[msg.sender][i] == doctor) { doctorExists = true; break; }
        }
        if (!doctorExists) patientDoctors[msg.sender].push(doctor);

        bool patientExists = false;
        for (uint256 i = 0; i < doctorPatients[doctor].length; i++) {
            if (doctorPatients[doctor][i] == msg.sender) { patientExists = true; break; }
        }
        if (!patientExists) doctorPatients[doctor].push(msg.sender);

        for (uint256 i = 0; i < patientRecords[msg.sender].length; i++) {
            FHE.allow(patientRecords[msg.sender][i].heartRate,    doctor);
            FHE.allow(patientRecords[msg.sender][i].oxygenLevel,  doctor);
            FHE.allow(patientRecords[msg.sender][i].glucoseLevel, doctor);
            FHE.allow(patientRecords[msg.sender][i].temperature,  doctor);
        }
        emit AccessGranted(msg.sender, doctor, block.timestamp);
    }

    function revokeAccess(address doctor) external {
        require(accessGrants[msg.sender][doctor], "MediVault: no active grant");
        accessGrants[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor, block.timestamp);
    }

    function registerAsDoctor() external {
        registeredDoctors[msg.sender] = true;
        emit DoctorRegistered(msg.sender, block.timestamp);
    }

    function sendMessage(address to, string calldata content) external {
        require(to != address(0), "MediVault: zero address");
        Message memory msg_ = Message({
            sender: msg.sender, receiver: to,
            content: content, timestamp: block.timestamp
        });
        messages[msg.sender][to].push(msg_);
        messages[to][msg.sender].push(msg_);
        emit MessageSent(msg.sender, to, block.timestamp);
    }

    function getMessages(address with_) external view returns (Message[] memory) {
        return messages[msg.sender][with_];
    }

    function getRecordCount(address patient)
        external view onlyPatientOrAuthorizedDoctor(patient) returns (uint256) {
        return patientRecords[patient].length;
    }

    function getRecord(address patient, uint256 index)
        external view onlyPatientOrAuthorizedDoctor(patient)
        returns (euint32, euint32, euint32, euint32, uint256, string memory) {
        require(index < patientRecords[patient].length, "MediVault: out of bounds");
        HealthRecord storage r = patientRecords[patient][index];
        return (r.heartRate, r.oxygenLevel, r.glucoseLevel, r.temperature, r.timestamp, r.recordType);
    }

    function getGrantedDoctors(address patient) external view returns (address[] memory) {
        require(msg.sender == patient, "MediVault: only patient");
        return patientDoctors[patient];
    }

    function hasAccess(address patient, address doctor) external view returns (bool) {
        return accessGrants[patient][doctor];
    }

    function getMyPatients(address doctor) external view returns (address[] memory) {
        require(msg.sender == doctor, "MediVault: only doctor");
        return doctorPatients[doctor];
    }

    function getRecordMetadata(address patient, uint256 index)
        external view onlyPatientOrAuthorizedDoctor(patient) returns (string memory) {
        require(index < patientRecords[patient].length, "MediVault: out of bounds");
        return recordMetadata[patient][index];
    }

    /**
 * @notice Patient updates metadata for their own record
 */
function updateRecordMetadata(address patient, uint256 index, string calldata newMetadata)
    external
{
    require(msg.sender == patient, "MediVault: only patient can edit");
    require(index < patientRecords[patient].length, "MediVault: out of bounds");
    recordMetadata[patient][index] = newMetadata;
}

    function isRegisteredDoctor(address account) external view returns (bool) {
        return registeredDoctors[account];
    }
}