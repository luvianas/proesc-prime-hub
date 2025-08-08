import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, UserPlus, Calendar, TrendingUp } from "lucide-react";

interface MatriculaDashboardProps {
  onBack: () => void;
}

const MatriculaDashboard = ({ onBack }: MatriculaDashboardProps) => {
  const stats = [
    {
      title: "Matrículas Este Mês",
      value: "24",
      change: "+12%",
      icon: UserPlus,
      color: "text-green-600"
    },
    {
      title: "Total de Alunos",
      value: "847",
      change: "+5%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Candidatos em Processo",
      value: "18",
      change: "+8%",
      icon: Calendar,
      color: "text-orange-600"
    },
    {
      title: "Taxa de Conversão",
      value: "78%",
      change: "+3%",
      icon: TrendingUp,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard de Matrícula</h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.color}>{stat.change}</span> em relação ao mês passado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Dashboard Content */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sistema de Matrículas - Red House Internacional School</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src="https://graficos.proesc.com/public/dashboard/ea74f678-24d5-4413-af6a-5afeae7f2d60?data=thisyear&entidade_id=4442&tab=319-dashboard"
            title="Dashboard de Matrícula"
            width="100%"
            height="800"
            frameBorder="0"
            allowTransparency
            className="w-full border-0"
            style={{ minHeight: '800px' }}
          />
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p><strong>Dashboard de Matrícula:</strong> Acompanhe o processo de matrículas, novos alunos e conversões em tempo real.</p>
      </div>
    </div>
  );
};

export default MatriculaDashboard;