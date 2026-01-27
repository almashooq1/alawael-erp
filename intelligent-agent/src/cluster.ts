// دعم توزيع المهام على أكثر من Agent (Cluster)
import cluster from 'cluster';
import os from 'os';

export function startCluster(main: () => void) {
  if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker) => {
      console.log(`Worker ${worker.process.pid} died, restarting...`);
      cluster.fork();
    });
  } else {
    main();
  }
}
