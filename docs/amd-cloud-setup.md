# AMD Developer Cloud Setup Guide for noRot

## Context

All the **code** is already done (7 files modified/created, typecheck clean). What's left is the **server setup** — you need a running vLLM instance on AMD hardware so the app has an endpoint to call. Without it, the app still works fine (falls back to local scripts), but you won't get AI-generated interventions from AMD Cloud.

---

## Step-by-Step: Get Your AMD Cloud Server Running

### Step 1: Join the AMD AI Developer Program (get free credits)

1. Go to **https://www.amd.com/en/developer/ai-dev-program.html**
2. Click the signup button and fill out the form (name, email, etc.)
3. It's free — you'll get **$100 in cloud credits** (~50 GPU hours), plenty for the hackathon
4. Check your email for a confirmation with a link to the member site
5. On the member site, find the **"$100 credit link"** for AMD Developer Cloud and click it to activate your credits

### Step 2: Create a GPU VM on AMD Developer Cloud

1. Go to **https://www.amd.com/en/developer/resources/cloud-access/amd-developer-cloud.html** (or the link from your member portal)
2. Log in with your account
3. Click **"Create GPU Droplet"** (or similar button)
4. Configure the VM:
   - **Hardware**: Select the **Small** tier — **1x MI300X GPU** (192 GB GPU memory, 20 vCPUs, 240 GB RAM). This is more than enough for Llama 3.1 8B
   - **Software Image**: Select the **vLLM** pre-built image (this has ROCm + vLLM already installed — no manual setup needed)
   - **SSH Key**: Click "Add an SSH Key", paste your public key (see Step 2a if you don't have one)
5. Click **"Create GPU Droplet"**
6. Wait for the VM to provision — you'll see an **Overview page** with your VM's **public IP address** (e.g., `143.198.xxx.xxx`). **Copy this IP.**

#### Step 2a: Generate an SSH key (if you don't have one)

Open your terminal (Git Bash on Windows) and run:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```
Press Enter for defaults. Then copy the public key:
```bash
cat ~/.ssh/id_ed25519.pub
```
Paste that into the AMD Cloud "Add SSH Key" field.

### Step 3: SSH into your VM

Open your terminal and run:
```bash
ssh root@<YOUR_VM_IP>
```
Replace `<YOUR_VM_IP>` with the IP from Step 2. You should see a welcome screen.

### Step 4: Launch vLLM (serve the Llama model)

Since you selected the **vLLM pre-built image**, vLLM is already installed. You might be inside a Docker container already (check the welcome message). If not, the vLLM Docker steps are shown in the green box on the welcome screen.

**Option A: If vLLM is already available in your environment** (try this first):
```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --dtype auto \
  --api-key norot-hackathon-key \
  --port 8000 \
  --max-model-len 512
```

**Option B: If you need to enter the Docker container first:**
```bash
# Look for the Docker command in the welcome screen, it will look something like:
docker run -it --rm \
  --network=host \
  --device=/dev/kfd \
  --device=/dev/dri \
  --group-add=video \
  --ipc=host \
  --cap-add=SYS_PTRACE \
  --security-opt seccomp=unconfined \
  --shm-size 8G \
  vllm/vllm-openai-rocm:latest \
  vllm serve meta-llama/Llama-3.1-8B-Instruct \
    --dtype auto \
    --api-key norot-hackathon-key \
    --port 8000 \
    --max-model-len 512
```

**What happens:** The model will download (~16 GB first time, cached after) and then you'll see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```
That means the server is ready. **Keep this terminal open.**

### Step 5: Test the endpoint

Open a **new terminal** (don't close the vLLM one) and run:
```bash
curl http://<YOUR_VM_IP>:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer norot-hackathon-key" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Say hello in one sentence"}],
    "max_tokens": 50
  }'
```

If you get a JSON response with generated text, your server is working.

**If you get "connection refused":** The port might be blocked. AMD Developer Cloud VMs typically have all ports open, but if not, check if there's a firewall config in the cloud dashboard.

### Step 6: Connect noRot to the server

1. Run `npm run dev:desktop` on your machine
2. Open the app, go to **Settings**
3. In the **"AMD Cloud Endpoint"** section:
   - **URL field**: Enter `http://<YOUR_VM_IP>:8000` (just the base URL, the code adds `/v1/chat/completions` automatically)
   - **API key field**: Enter `norot-hackathon-key` (the key you set in `--api-key`)
   - Click **Save**
4. The **"AMD Cloud"** button in the Script Source toggle should now be clickable — click it
5. Click **"Test Intervention"** to verify everything works end-to-end

---

## Quick Reference

| What | Value |
|------|-------|
| Signup | https://www.amd.com/en/developer/ai-dev-program.html |
| Cloud portal | https://www.amd.com/en/developer/resources/cloud-access/amd-developer-cloud.html |
| Free credits | $100 (~50 hours), expires 30 days after activation |
| VM size needed | Small (1x MI300X, 192GB) |
| Image to select | vLLM (pre-built) |
| Model | `meta-llama/Llama-3.1-8B-Instruct` |
| noRot URL field | `http://<VM_IP>:8000` |
| noRot API key field | whatever you set in `--api-key` |
| Support email | devcloudrequests@amd.com |

---

## Troubleshooting

- **"AMD Cloud" button is grayed out**: You haven't saved an endpoint URL yet. Paste the URL and click Save first.
- **Test intervention shows local text (not AI)**: The AMD endpoint is unreachable. Check that vLLM is still running in your SSH terminal and that the IP/port are correct.
- **vLLM crashes or OOM**: Try `--max-model-len 256` to use less memory, or `--enforce-eager` to skip CUDA graphs.
- **Model download is slow**: First download takes ~16 GB. It's cached after that. Be patient.
- **Credits question**: Email devcloudrequests@amd.com — they're responsive.
- **The app works fine without AMD Cloud**: It just falls back to the built-in local scripts. AMD Cloud is an optional AI upgrade.

---

## Sources

- [AMD AI Developer Program](https://www.amd.com/en/developer/ai-dev-program.html)
- [AMD Developer Cloud](https://www.amd.com/en/developer/resources/cloud-access/amd-developer-cloud.html)
- [How to Get Started on the AMD Developer Cloud](https://www.amd.com/en/developer/resources/technical-articles/2025/how-to-get-started-on-the-amd-developer-cloud-.html)
- [Deploying Llama-3.1 8B using vLLM (ROCm docs)](https://rocm.docs.amd.com/projects/ai-developer-hub/en/latest/notebooks/inference/3_inference_ver3_HF_vllm.html)
- [vLLM Forums — AMD Developer Cloud free GPU hours](https://discuss.vllm.ai/t/amd-developer-cloud-free-gpu-hours/974)
- [OpenClaw with vLLM on AMD Developer Cloud](https://www.amd.com/en/developer/resources/technical-articles/2026/openclaw-with-vllm-running-for-free-on-amd-developer-cloud-.html)
