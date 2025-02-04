// 创建 canvas
const canvas = document.createElement('canvas');
canvas.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 1; pointer-events: none;';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

// 设置 canvas 尺寸
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 烟花类
class Firework {
  constructor() {
    // 从底部随机位置发射
    this.x = Math.random() * canvas.width;
    this.y = canvas.height;
    // 目标高度在上半部分
    this.targetY = canvas.height * 0.3 + (Math.random() * canvas.height * 0.2);
    this.speed = 5 + Math.random() * 2;
    this.particles = [];
    this.exploded = false;
    this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
  }

  update() {
    if (!this.exploded) {
      // 上升阶段
      this.y -= this.speed;
      if (this.y <= this.targetY) {
        this.explode();
      }
    } else {
      // 爆炸后更新粒子
      this.particles = this.particles.filter(particle => {
        particle.update();
        return particle.alpha > 0;
      });
    }
  }

  draw() {
    if (!this.exploded) {
      // 绘制上升轨迹
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + 10);
      ctx.stroke();
    } else {
      // 绘制爆炸粒子
      this.particles.forEach(particle => particle.draw());
    }
  }

  explode() {
    this.exploded = true;
    // 增加更多粒子
    for (let i = 0; i < 200; i++) {  // 增加到200个粒子
      this.particles.push(new Particle(this.x, this.y, this.color));
    }
    // 添加一些较大的粒子作为核心
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle(this.x, this.y, this.color, true));
    }
  }
}

// 爆炸粒子类
class Particle {
  constructor(x, y, color, isCore = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCore = isCore;
    const angle = Math.random() * Math.PI * 2;
    const velocity = isCore ? 
      0.5 + Math.random() * 2 :  // 核心粒子速度较慢
      1 + Math.random() * 3;     // 外围粒子速度较快
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    this.alpha = 1;
    this.gravity = isCore ? 0.02 : 0.03;  // 核心粒子受重力影响更小
    
    // 添加闪烁效果
    this.flicker = Math.random() * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    
    // 闪烁效果
    if (this.isCore) {
      this.alpha = Math.max(0, this.alpha - 0.005);  // 核心粒子消失更慢
    } else {
      this.alpha = Math.max(0, this.alpha - 0.01 + Math.sin(Date.now() * 0.01) * this.flicker);
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    // 核心粒子更大，并添加模糊效果
    if (this.isCore) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    } else {
      ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
    }
    
    ctx.fill();
    ctx.restore();
  }
}

// 管理烟花
let fireworks = [];

let lastTime = 0;
const fps = 60;
const frameInterval = 1000 / fps;

function animate(currentTime) {
  // 控制帧率
  if (currentTime - lastTime < frameInterval) {
    requestAnimationFrame(animate);
    return;
  }
  lastTime = currentTime;

  // 清除画布，保持背景透明
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 降低发射频率
  if (Math.random() < 0.03) {
    fireworks.push(new Firework());
  }

  // 更新和绘制烟花
  fireworks = fireworks.filter(firework => {
    firework.update();
    firework.draw();
    return firework.exploded ? firework.particles.length > 0 : true;
  });

  requestAnimationFrame(animate);
}

// 启动动画
animate(0); 