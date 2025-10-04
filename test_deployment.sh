#!/bin/bash

# CBIT-AiForge Deployment Test Script
# Tests if the Docker deployment is working correctly

set -e

echo "========================================="
echo "  CBIT-AiForge Deployment Test"
echo "  Testing Docker containers..."
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Docker is running
echo "📦 Test 1: Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Test 2: Check if containers are running
echo "🐳 Test 2: Checking containers..."
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Containers are not running. Starting them...${NC}"
    docker-compose up -d
    echo "Waiting for services to start..."
    sleep 10
fi

BACKEND_STATUS=$(docker-compose ps backend | grep "Up" || echo "Down")
FRONTEND_STATUS=$(docker-compose ps frontend | grep "Up" || echo "Down")

if [[ $BACKEND_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
else
    echo -e "${RED}❌ Backend container is not running${NC}"
    exit 1
fi

if [[ $FRONTEND_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}✅ Frontend container is running${NC}"
else
    echo -e "${RED}❌ Frontend container is not running${NC}"
    exit 1
fi
echo ""

# Test 3: Check backend health
echo "🏥 Test 3: Testing backend health endpoint..."
BACKEND_HEALTH=$(curl -s http://localhost:8000/health || echo "failed")
if [[ $BACKEND_HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
    echo "   Response: $BACKEND_HEALTH"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "   Checking logs..."
    docker-compose logs --tail=20 backend
    exit 1
fi
echo ""

# Test 4: Check frontend
echo "🌐 Test 4: Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
    echo "   HTTP Status: $FRONTEND_RESPONSE"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
    echo "   HTTP Status: $FRONTEND_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Check API documentation
echo "📚 Test 5: Testing API documentation..."
API_DOCS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs || echo "000")
if [ "$API_DOCS" = "200" ]; then
    echo -e "${GREEN}✅ API documentation is accessible${NC}"
    echo "   URL: http://localhost:8000/docs"
else
    echo -e "${RED}❌ API documentation is not accessible${NC}"
    exit 1
fi
echo ""

# Test 6: Check volumes
echo "💾 Test 6: Checking Docker volumes..."
if docker volume ls | grep -q "aiforge_data"; then
    echo -e "${GREEN}✅ Data volume exists${NC}"
else
    echo -e "${RED}❌ Data volume not found${NC}"
    exit 1
fi

if docker volume ls | grep -q "aiforge_logs"; then
    echo -e "${GREEN}✅ Logs volume exists${NC}"
else
    echo -e "${RED}❌ Logs volume not found${NC}"
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}  ✅ All tests passed!${NC}"
echo "========================================="
echo ""
echo "🎉 Deployment is working correctly!"
echo ""
echo "Access your application:"
echo "  • Frontend:  http://localhost:80"
echo "  • Backend:   http://localhost:8000"
echo "  • API Docs:  http://localhost:8000/docs"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""

