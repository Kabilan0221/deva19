import React, { useEffect, useRef } from 'react';

export const FestiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle structure for golden sparks, glowing embers and crackers
    interface SparkParticle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
      fadeSpeed: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: SparkParticle[] = [];
    const colors = [
      '#FFD700', // Gold
      '#FFA500', // Amber
      '#FF4500', // Red Orange
      '#FF6347', // Tomato
      '#FFE4B5', // Warm cream
      '#32CD32', // Green spark
      '#00E5FF', // Cyan spark
    ];

    const createParticle = (): SparkParticle => {
      return {
        x: Math.random() * width,
        y: height + Math.random() * 20,
        size: Math.random() * 2.8 + 0.8,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: -(Math.random() * 1.8 + 0.6),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
        fadeSpeed: Math.random() * 0.005 + 0.002,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
      };
    };

    // Initial particles
    for (let i = 0; i < 45; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Add a few more particles occasionally
      if (particles.length < 50 && Math.random() < 0.3) {
        particles.push(createParticle());
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha -= p.fadeSpeed;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0 || p.y < -20 || p.x < -20 || p.x > width + 20) {
          particles[i] = createParticle();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Draw 4-point sparkle star
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(0, -s * 2.2);
        ctx.quadraticCurveTo(0, 0, s * 2.2, 0);
        ctx.quadraticCurveTo(0, 0, 0, s * 2.2);
        ctx.quadraticCurveTo(0, 0, -s * 2.2, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s * 2.2);
        ctx.fill();

        // Core glow dot
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
