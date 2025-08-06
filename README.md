# 🚀 WSS Proxy Server Deployment Guide

## Overview

This guide will help you deploy the **WebSocket Secure (WSS) Proxy Server** to bridge HTTPS websites to local ESP32 devices.

## 🎯 Why WSS Proxy?

**Problem:**
- ✅ HTTPS websites can't connect to local ESP32 devices
- ✅ Mixed content policy blocks `ws://` and `http://` connections
- ✅ Customers can't use the app on `https://business.hesett.com`

**Solution:**
- ✅ WSS proxy server runs on HTTPS (Railway/Render/Fly.io)
- ✅ Accepts secure WebSocket connections from your website
- ✅ Forwards to local ESP32 devices
- ✅ Handles all mixed content issues

## 🚀 Deployment Options

### Option 1: Railway (Recommended)

**Step 1: Create Railway Account**
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project

**Step 2: Deploy WSS Proxy**
```bash
# Clone the repository
git clone https://github.com/zaikouw/Hesett-Dashboard-Client-main.git
cd Hesett-Dashboard-Client-main

# Copy WSS proxy files
cp wss_proxy_server.js railway.json wss_proxy_package.json ./

# Deploy to Railway
railway login
railway init
railway up
```

**Step 3: Configure Environment**
- Set `PORT` to `3000`
- Set `NODE_ENV` to `production`

**Step 4: Get WSS URL**
- Railway will provide: `wss://your-app-name.railway.app`

### Option 2: Render

**Step 1: Create Render Account**
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Create new Web Service

**Step 2: Deploy WSS Proxy**
```bash
# Create render.yaml
cp render.yaml ./

# Connect GitHub repository
# Render will auto-deploy from your repo
```

**Step 3: Configure Service**
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** `Node`

**Step 4: Get WSS URL**
- Render will provide: `wss://your-app-name.onrender.com`

### Option 3: Fly.io

**Step 1: Install Fly CLI**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login
```

**Step 2: Deploy WSS Proxy**
```bash
# Create fly.toml
fly launch

# Deploy
fly deploy
```

**Step 3: Get WSS URL**
- Fly will provide: `wss://your-app-name.fly.dev`

## 🔧 Configuration

### Environment Variables

```bash
# Required
PORT=3000
NODE_ENV=production

# Optional
LOG_LEVEL=info
CORS_ORIGIN=https://business.hesett.com
```

### ESP32 Targets

Edit `wss_proxy_server.js` to add your ESP32 IP addresses:

```javascript
const ESP32_TARGETS = [
  '192.168.58.100:81',  // Your ESP32
  '192.168.58.115:81', 
  '192.168.58.113:81',
  '192.168.58.114:81',
  '192.168.1.100:81',
  '192.168.0.100:81',
  '192.168.4.1:81'
];
```

## 🌐 Integration with Flutter App

### Update Flutter Code

The Flutter app will automatically detect HTTPS and use the WSS proxy:

```dart
// WSS proxy server URL (update this with your deployed URL)
String wssProxyUrl = 'wss://your-app-name.onrender.com';
```

### Test Connection

1. **Deploy WSS proxy** to Railway/Render/Fly.io
2. **Update Flutter app** with WSS proxy URL
3. **Test on HTTPS**: `https://business.hesett.com`
4. **Verify connection**: Should connect to ESP32 via WSS proxy

## 📊 Monitoring

### Health Check
```bash
curl https://your-app-name.onrender.com/health
```

### Discovery Endpoint
```bash
curl https://your-app-name.onrender.com/discover
```

### Logs
- **Railway**: `railway logs`
- **Render**: Dashboard → Logs
- **Fly.io**: `fly logs`

## 🔒 Security

### CORS Configuration
```javascript
app.use(cors({
  origin: ['https://business.hesett.com', 'http://localhost:8080'],
  credentials: true
}));
```

### Rate Limiting
Consider adding rate limiting for production:
```bash
npm install express-rate-limit
```

## 🚨 Troubleshooting

### Common Issues

**1. Connection Refused**
- Check if ESP32 is running
- Verify IP addresses in `ESP32_TARGETS`
- Test local connection first

**2. CORS Errors**
- Update `CORS_ORIGIN` in environment variables
- Check browser console for errors

**3. WSS Connection Failed**
- Verify WSS proxy URL is correct
- Check if proxy server is running
- Test with `wscat` or similar tool

### Debug Commands

```bash
# Test WSS proxy connection
wscat -c wss://your-app-name.onrender.com

# Test ESP32 connection
curl http://192.168.58.100:80/status

# Check proxy logs
railway logs
```

## 📈 Performance

### Optimization Tips

1. **Connection Pooling**: Reuse connections when possible
2. **Error Handling**: Implement retry logic
3. **Monitoring**: Add metrics and alerts
4. **Scaling**: Use multiple instances for high traffic

### Resource Requirements

- **CPU**: 0.5 vCPU minimum
- **RAM**: 512MB minimum
- **Storage**: 1GB minimum
- **Network**: 100MB/s

## 🎯 Success Criteria

✅ **WSS proxy deployed** to Railway/Render/Fly.io
✅ **Flutter app updated** with WSS proxy URL
✅ **HTTPS website** connects to ESP32 via WSS proxy
✅ **All features work** (pairing, signals, restaurant ID)
✅ **Customers can use** `https://business.hesett.com`

## 📞 Support

If you encounter issues:

1. **Check logs**: `railway logs` or dashboard
2. **Test locally**: `npm run dev`
3. **Verify ESP32**: Ensure it's running and accessible
4. **Contact support**: Create issue in GitHub repository

---

**🎯 Result: Your customers can now use the full app on HTTPS without any setup!** 