// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialHealthRecords
 * @notice MediVault — FHE-encrypted patient health records on Sepolia
 * @dev Uses FHEVM so encrypted data is never exposed on-chain
 */
contract ConfidentialHealthRecords is ZamaEthereumConfig {

    // ─── Structs ──────────────────────────────────────────────────
    struct HealthRecord {
        euint32 heartRate;        // encrypted bpm
        euint32 oxygenLevel;      // encrypted %
        euint32 glucoseLevel;     // encrypted mg/dL
        euint32 temperature;      // encrypted °C × 10 (e.g. 366 = 36.6°C)
        uint256 timestamp;
        string  recordType;       // "blood_panel" | "vitals" | "xray" | "vaccination"
        bool    exists;
    }

    // ─── State ────────────────────────────────────────────────────
    // patient address => array of records
    mapping(address => HealthRecord[]) private patientRecords;

    // patient => doctor => is access granted
    mapping(address => mapping(address => bool)) private accessGrants;

    // patient => list of doctors they granted access to
    mapping(address => address[]) private patientDoctors;

    // total records stored (for stats)
    uint256 public totalRecordsStored;

    // ─── Events ───────────────────────────────────────────────────
    event RecordAdded(address indexed patient, uint256 indexed recordIndex, string recordType, uint256 timestamp);
    event AccessGranted(address indexed patient, address indexed doctor, uint256 timestamp);
    event AccessRevoked(address indexed patient, address indexed doctor, uint256 timestamp);

    // ─── Modifiers ────────────────────────────────────────────────
    modifier onlyPatientOrAuthorizedDoctor(address patient) {
        require(
            msg.sender == patient || accessGrants[patient][msg.sender],
            "MediVault: not authorized"
        );
        _;
    }

    // ─── Core Functions ───────────────────────────────────────────

    /**
     * @notice Patient adds an encrypted health record
     * @param encHeartRate   Encrypted heart rate (einput from client)
     * @param encOxygen      Encrypted oxygen level
     * @param encGlucose     Encrypted glucose level
     * @param encTemp        Encrypted temperature × 10
     * @param heartProof     FHE input proof for heartRate
     * @param oxygenProof    FHE input proof for oxygenLevel
     * @param glucoseProof   FHE input proof for glucoseLevel
     * @param tempProof      FHE input proof for temperature
     * @param recordType     Plain-text record category (not sensitive)
     */
    function addRecord(
        externalEuint32 encHeartRate,
        externalEuint32 encOxygen,
        externalEuint32 encGlucose,
        externalEuint32 encTemp,
        bytes calldata heartProof,
        bytes calldata oxygenProof,
        bytes calldata glucoseProof,
        bytes calldata tempProof,
        string calldata recordType
    ) external {
        euint32 hr   = FHE.fromExternal(encHeartRate,  heartProof);
        euint32 o2   = FHE.fromExternal(encOxygen,     oxygenProof);
        euint32 gluc = FHE.fromExternal(encGlucose,    glucoseProof);
        euint32 temp = FHE.fromExternal(encTemp,       tempProof);

        // Allow the contract itself to handle these ciphertexts
        FHE.allowThis(hr);
        FHE.allowThis(o2);
        FHE.allowThis(gluc);
        FHE.allowThis(temp);

        // Allow the patient (sender) to later decrypt their own data
        FHE.allow(hr,   msg.sender);
        FHE.allow(o2,   msg.sender);
        FHE.allow(gluc, msg.sender);
        FHE.allow(temp, msg.sender);

        patientRecords[msg.sender].push(HealthRecord({
            heartRate:    hr,
            oxygenLevel:  o2,
            glucoseLevel: gluc,
            temperature:  temp,
            timestamp:    block.timestamp,
            recordType:   recordType,
            exists:       true
        }));

        totalRecordsStored++;
        uint256 idx = patientRecords[msg.sender].length - 1;
        emit RecordAdded(msg.sender, idx, recordType, block.timestamp);
    }

    /**
     * @notice Patient grants a doctor access to all their records
     * @param doctor  Doctor's wallet address
     */
    function grantAccess(address doctor) external {
        require(doctor != address(0), "MediVault: zero address");
        require(!accessGrants[msg.sender][doctor], "MediVault: already granted");

        accessGrants[msg.sender][doctor] = true;
        patientDoctors[msg.sender].push(doctor);

        // Re-allow all existing ciphertexts for this doctor
        HealthRecord[] storage records = patientRecords[msg.sender];
        for (uint256 i = 0; i < records.length; i++) {
            FHE.allow(records[i].heartRate,    doctor);
            FHE.allow(records[i].oxygenLevel,  doctor);
            FHE.allow(records[i].glucoseLevel, doctor);
            FHE.allow(records[i].temperature,  doctor);
        }

        emit AccessGranted(msg.sender, doctor, block.timestamp);
    }

    /**
     * @notice Patient revokes a doctor's access
     * @param doctor  Doctor's wallet address
     */
    function revokeAccess(address doctor) external {
        require(accessGrants[msg.sender][doctor], "MediVault: no active grant");
        accessGrants[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────

    /**
     * @notice Returns the number of records for a patient
     */
    function getRecordCount(address patient)
        external
        view
        onlyPatientOrAuthorizedDoctor(patient)
        returns (uint256)
    {
        return patientRecords[patient].length;
    }

    /**
     * @notice Returns encrypted handles for a specific record
     *         Caller must have FHE permission to decrypt them off-chain
     */
    function getRecord(address patient, uint256 index)
        external
        view
        onlyPatientOrAuthorizedDoctor(patient)
        returns (
            euint32 heartRate,
            euint32 oxygenLevel,
            euint32 glucoseLevel,
            euint32 temperature,
            uint256 timestamp,
            string memory recordType
        )
    {
        require(index < patientRecords[patient].length, "MediVault: out of bounds");
        HealthRecord storage r = patientRecords[patient][index];
        return (r.heartRate, r.oxygenLevel, r.glucoseLevel, r.temperature, r.timestamp, r.recordType);
    }

    /**
     * @notice Returns list of doctors a patient has granted access to
     */
    function getGrantedDoctors(address patient)
        external
        view
        returns (address[] memory)
    {
        require(msg.sender == patient, "MediVault: only patient");
        return patientDoctors[patient];
    }

    /**
     * @notice Check if a doctor has access to a patient's records
     */
    function hasAccess(address patient, address doctor)
        external
        view
        returns (bool)
    {
        return accessGrants[patient][doctor];
    }
}
