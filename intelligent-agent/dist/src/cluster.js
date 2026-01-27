"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCluster = startCluster;
// دعم توزيع المهام على أكثر من Agent (Cluster)
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
function startCluster(main) {
    if (cluster_1.default.isPrimary) {
        const numCPUs = os_1.default.cpus().length;
        for (let i = 0; i < numCPUs; i++) {
            cluster_1.default.fork();
        }
        cluster_1.default.on('exit', (worker) => {
            console.log(`Worker ${worker.process.pid} died, restarting...`);
            cluster_1.default.fork();
        });
    }
    else {
        main();
    }
}
