// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AIOracle
 * @dev AI-assisted oracle for fast prediction market resolution
 * @notice Implements YZi Labs track: domain-specific AI-assisted oracles
 */
contract AIOracle is Ownable {
    struct ResolutionRequest {
        uint256 marketId;
        string dataSource;
        uint256 timestamp;
        bool resolved;
        bool outcome;
        uint256 confidence; // 0-10000 (0-100%)
        string evidenceHash; // IPFS hash of evidence
    }

    struct DataSource {
        string name;
        string apiEndpoint;
        bool active;
        uint256 successRate; // Historical success rate
    }

    mapping(uint256 => ResolutionRequest) public resolutionRequests;
    mapping(string => DataSource) public dataSources;
    mapping(address => bool) public aiAgents;

    address public predictionMarketContract;
    uint256 public requestCount;
    uint256 public constant MIN_CONFIDENCE = 8000; // 80% minimum confidence

    event ResolutionRequested(
        uint256 indexed requestId,
        uint256 indexed marketId,
        string dataSource
    );

    event ResolutionProvided(
        uint256 indexed requestId,
        bool outcome,
        uint256 confidence
    );

    event DataSourceAdded(string name, string apiEndpoint);

    constructor(address _predictionMarketContract) Ownable(msg.sender) {
        predictionMarketContract = _predictionMarketContract;
        
        // Initialize default data sources — Somnia DreamDEX Event Contracts settlement rail
        // DreamDEX BinaryMarketsModule trusts only OracleHub 0xe40db387... as settler via Somnia reactivity.
        // Verify: https://prd.oracle.somnia.host/questions/{oracleQuestionId}?view=graph
        // Client: getMarketResolution(marketId).openingAnswer.numericValue vs closingAnswer.numericValue
        _addDataSource("SomniaOracleHub", "https://prd.oracle.somnia.host");
        _addDataSource("DreamDEXSettlement", "https://stg.api.dreamdex.io/v0");
        _addDataSource("Groq", "https://api.groq.com/openai/v1");
    }

    /**
     * @dev Request AI-assisted resolution for a market
     */
    function requestResolution(uint256 _marketId, string memory _dataSource) 
        external 
    {
        require(bytes(_dataSource).length > 0, "Data source required");
        require(dataSources[_dataSource].active, "Data source not active");

        requestCount++;
        resolutionRequests[requestCount] = ResolutionRequest({
            marketId: _marketId,
            dataSource: _dataSource,
            timestamp: block.timestamp,
            resolved: false,
            outcome: false,
            confidence: 0,
            evidenceHash: ""
        });

        emit ResolutionRequested(requestCount, _marketId, _dataSource);
    }

    /**
     * @dev Provide AI-generated resolution (called by authorized AI agents)
     */
    function provideResolution(
        uint256 _requestId,
        bool _outcome,
        uint256 _confidence,
        string memory _evidenceHash
    ) external {
        require(aiAgents[msg.sender], "Not authorized AI agent");
        require(!resolutionRequests[_requestId].resolved, "Already resolved");
        require(_confidence >= MIN_CONFIDENCE, "Confidence too low");

        ResolutionRequest storage request = resolutionRequests[_requestId];
        request.resolved = true;
        request.outcome = _outcome;
        request.confidence = _confidence;
        request.evidenceHash = _evidenceHash;

        emit ResolutionProvided(_requestId, _outcome, _confidence);
    }

    /**
     * @dev Get resolution status for a market
     */
    function getResolutionStatus(uint256 _marketId) 
        external 
        view 
        returns (
            bool pending,
            uint256 confidence,
            bool suggestedOutcome,
            string memory evidenceHash
        ) 
    {
        for (uint256 i = 1; i <= requestCount; i++) {
            ResolutionRequest storage req = resolutionRequests[i];
            if (req.marketId == _marketId) {
                return (
                    !req.resolved,
                    req.confidence,
                    req.outcome,
                    req.evidenceHash
                );
            }
        }
        return (false, 0, false, "");
    }

    /**
     * @dev Add a new data source
     */
    function addDataSource(string memory _name, string memory _apiEndpoint) 
        external 
        onlyOwner 
    {
        _addDataSource(_name, _apiEndpoint);
    }

    function _addDataSource(string memory _name, string memory _apiEndpoint) 
        internal 
    {
        dataSources[_name] = DataSource({
            name: _name,
            apiEndpoint: _apiEndpoint,
            active: true,
            successRate: 10000 // 100% initial
        });
        emit DataSourceAdded(_name, _apiEndpoint);
    }

    /**
     * @dev Set AI agent authorization
     */
    function setAIAgent(address _agent, bool _authorized) 
        external 
        onlyOwner 
    {
        aiAgents[_agent] = _authorized;
    }

    /**
     * @dev Update data source status
     */
    function updateDataSource(
        string memory _name,
        bool _active,
        uint256 _successRate
    ) external onlyOwner {
        DataSource storage ds = dataSources[_name];
        require(bytes(ds.name).length > 0, "Data source does not exist");
        ds.active = _active;
        ds.successRate = _successRate;
    }
}
