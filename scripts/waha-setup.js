#!/usr/bin/env node

/**
 * WAHA Setup and Management Script
 * Provides utilities to start, stop, and manage WAHA Docker containers
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WAHAManager {
  constructor() {
    this.composeFile = 'docker-compose.waha.yml';
    this.envFile = '.env';
  }

  /**
   * Check if Docker is installed and running
   */
  checkDockerAvailability() {
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker-compose --version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error('❌ Docker or Docker Compose not found. Please install Docker first.');
      return false;
    }
  }

  /**
   * Check if required environment variables are set
   */
  checkEnvironmentVariables() {
    const requiredVars = [
      'WAHA_API_KEY',
      'WAHA_WEBHOOK_SECRET'
    ];

    const missingVars = [];

    if (fs.existsSync(this.envFile)) {
      const envContent = fs.readFileSync(this.envFile, 'utf8');
      
      requiredVars.forEach(varName => {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`)) {
          missingVars.push(varName);
        }
      });
    } else {
      missingVars.push(...requiredVars);
    }

    if (missingVars.length > 0) {
      console.error('❌ Missing or incomplete environment variables:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\nPlease update your .env file with proper values.');
      return false;
    }

    return true;
  }

  /**
   * Start WAHA services
   */
  async startWAHA(options = {}) {
    const { withRedis = false, detached = true } = options;

    console.log('🚀 Starting WAHA services...');

    if (!this.checkDockerAvailability() || !this.checkEnvironmentVariables()) {
      process.exit(1);
    }

    try {
      const profiles = withRedis ? '--profile redis' : '';
      const detachFlag = detached ? '-d' : '';
      
      const command = `docker-compose -f ${this.composeFile} ${profiles} up ${detachFlag}`;
      
      console.log(`Executing: ${command}`);
      
      if (detached) {
        execSync(command, { stdio: 'inherit' });
        console.log('✅ WAHA services started successfully!');
        
        // Wait a moment and check health
        setTimeout(() => this.checkHealth(), 5000);
      } else {
        // Run in foreground for debugging
        const child = spawn('docker-compose', ['-f', this.composeFile, 'up'], {
          stdio: 'inherit'
        });
        
        child.on('close', (code) => {
          console.log(`WAHA services exited with code ${code}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to start WAHA services:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stop WAHA services
   */
  stopWAHA() {
    console.log('🛑 Stopping WAHA services...');

    try {
      execSync(`docker-compose -f ${this.composeFile} down`, { stdio: 'inherit' });
      console.log('✅ WAHA services stopped successfully!');
    } catch (error) {
      console.error('❌ Failed to stop WAHA services:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check WAHA service health
   */
  async checkHealth() {
    console.log('🔍 Checking WAHA health...');

    try {
      const wahaPort = process.env.WAHA_PORT || '3000';
      const response = await fetch(`http://localhost:${wahaPort}/api/health`);
      
      if (response.ok) {
        const health = await response.json();
        console.log('✅ WAHA is healthy!');
        console.log(`   Version: ${health.version || 'Unknown'}`);
        console.log(`   Status: ${health.status || 'Running'}`);
      } else {
        console.log(`⚠️  WAHA responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ WAHA health check failed:', error.message);
      console.log('   Make sure WAHA is running and accessible on the configured port.');
    }
  }

  /**
   * Show WAHA logs
   */
  showLogs(options = {}) {
    const { follow = false, tail = 100 } = options;
    
    console.log('📋 Showing WAHA logs...');

    try {
      const followFlag = follow ? '-f' : '';
      const tailFlag = `--tail=${tail}`;
      
      execSync(`docker-compose -f ${this.composeFile} logs ${followFlag} ${tailFlag}`, {
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('❌ Failed to show logs:', error.message);
    }
  }

  /**
   * Generate secure API keys
   */
  generateApiKeys() {
    const crypto = require('crypto');
    
    const apiKey = crypto.randomBytes(32).toString('hex');
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    
    console.log('🔑 Generated secure API keys:');
    console.log(`WAHA_API_KEY=${apiKey}`);
    console.log(`WAHA_WEBHOOK_SECRET=${webhookSecret}`);
    console.log('\nAdd these to your .env file');
  }

  /**
   * Show service status
   */
  showStatus() {
    console.log('📊 WAHA Service Status:');

    try {
      execSync(`docker-compose -f ${this.composeFile} ps`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to get service status:', error.message);
    }
  }
}

// CLI Interface
const manager = new WAHAManager();

const command = process.argv[2];
const options = process.argv.slice(3);

switch (command) {
  case 'start':
    const withRedis = options.includes('--redis');
    const foreground = options.includes('--foreground');
    manager.startWAHA({ withRedis, detached: !foreground });
    break;

  case 'stop':
    manager.stopWAHA();
    break;

  case 'health':
    manager.checkHealth();
    break;

  case 'logs':
    const follow = options.includes('--follow') || options.includes('-f');
    const tailMatch = options.find(opt => opt.startsWith('--tail='));
    const tail = tailMatch ? parseInt(tailMatch.split('=')[1]) : 100;
    manager.showLogs({ follow, tail });
    break;

  case 'status':
    manager.showStatus();
    break;

  case 'generate-keys':
    manager.generateApiKeys();
    break;

  default:
    console.log(`
🔧 WAHA Management Script

Usage: node scripts/waha-setup.js <command> [options]

Commands:
  start                 Start WAHA services
    --redis             Include Redis service
    --foreground        Run in foreground (for debugging)
  
  stop                  Stop WAHA services
  
  health                Check WAHA service health
  
  logs                  Show WAHA logs
    --follow, -f        Follow log output
    --tail=N            Show last N lines (default: 100)
  
  status                Show service status
  
  generate-keys         Generate secure API keys

Examples:
  node scripts/waha-setup.js start
  node scripts/waha-setup.js start --redis --foreground
  node scripts/waha-setup.js logs --follow
  node scripts/waha-setup.js health
`);
    break;
}