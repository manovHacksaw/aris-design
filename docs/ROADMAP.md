# Aris Development Roadmap

This roadmap tracks the current state of the Aris platform and planned future enhancements.

## 🟢 Completed (Q1-Q2 2026)
- **Architectural Cleanup**: Refactored controllers to follow the Service/Controller/Route pattern.
- **Security Audit**: Fixed financial double-counting bugs and secured anonymous voter identity exposure.
- **Dockerization**: Integrated full-stack orchestration via Docker Compose.
- **Service Resilience**: Implemented automatic retry logic for stuck reward pools.
- **Documentation**: Comprehensive READMEs and API technical guides.

## 🟡 In Progress (Current)
- **Unit Testing**: Expanding test coverage for core financial services (`RewardsDistributionService`).
- **Brand Onboarding**: Refining the UX for manual brand application and verification.
- **AI Reporting**: Tuning Gemini prompts for more accurate event analytics summaries.

## 🔴 Planned (Future)
- **Mobile App Integration**: Native mobile support for event discovery and voting.
- **Advanced IPFS Optimization**: Further reduction in CID resolution times for media-heavy events.
- **Secondary Markets**: Allowing users to trade or stake earned credentials/rewards.
- **Global Search**: High-performance search across brands, events, and participants.

---

## 🛠️ How to Contribute to the Roadmap
If you are adding a major feature:
1. Document the logic in `server/src/services`.
2. Update the corresponding Controller and Route.
3. Add any New models to the [Prisma Schema](file:///c:/Users/manov/Desktop/code/aris/server/prisma/schema.prisma).
4. Tag a version and update this Roadmap.
