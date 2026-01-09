/**
 * PMOCDataModal - Modal para inserir dados manuais do PMOC
 * 
 * Campos que precisam ser preenchidos manualmente:
 * - ART/RRT/TRT (número do registro profissional)
 * - Local de disponibilização do PMOC
 * - Responsável Técnico (nome, CREA, telefone, email)
 * - Responsável Legal (nome, cargo, documento)
 * - Dados de QAI (última coleta, valores medidos)
 * - Contatos de emergência
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  User,
  Shield,
  Wind,
  Phone,
  Save,
  X,
} from 'lucide-react';

// Tipos para os dados manuais do PMOC
export interface PMOCManualData {
  // Identificação do PMOC
  art_rrt_trt: string;
  disclosure_location: string;
  
  // Responsável Técnico
  responsible_technician: {
    name: string;
    crea: string;
    phone: string;
    email: string;
  };
  
  // Responsável Legal
  responsible_legal: {
    name: string;
    role: string;
    document: string;
  };
  
  // QAI - Última coleta
  qai: {
    last_sampled_at: string;
    laboratory: string;
    temperature: string;
    humidity: string;
    co2: string;
    air_velocity: string;
    particulates: string;
    fungi: string;
  };
  
  // Contatos de emergência
  emergency_contacts: {
    maintenance: string;
    building_manager: string;
  };
}

// Valores padrão
export const defaultPMOCManualData: PMOCManualData = {
  art_rrt_trt: '',
  disclosure_location: '',
  responsible_technician: {
    name: '',
    crea: '',
    phone: '',
    email: '',
  },
  responsible_legal: {
    name: '',
    role: '',
    document: '',
  },
  qai: {
    last_sampled_at: '',
    laboratory: '',
    temperature: '',
    humidity: '',
    co2: '',
    air_velocity: '',
    particulates: '',
    fungi: '',
  },
  emergency_contacts: {
    maintenance: '',
    building_manager: '',
  },
};

interface PMOCDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PMOCManualData;
  onSave: (data: PMOCManualData) => void;
}

export function PMOCDataModal({ open, onOpenChange, data, onSave }: PMOCDataModalProps) {
  const [formData, setFormData] = useState<PMOCManualData>(data);
  const [activeTab, setActiveTab] = useState('pmoc');

  // Sincroniza quando os dados externos mudam
  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const updateField = (path: string, value: string) => {
    setFormData((prev) => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Inserir Dados do PMOC
          </DialogTitle>
          <DialogDescription>
            Preencha os campos que precisam ser informados manualmente para o relatório PMOC.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pmoc" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              PMOC
            </TabsTrigger>
            <TabsTrigger value="responsaveis" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Responsáveis
            </TabsTrigger>
            <TabsTrigger value="qai" className="text-xs">
              <Wind className="w-3 h-3 mr-1" />
              QAI
            </TabsTrigger>
            <TabsTrigger value="emergencia" className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              Emergência
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4 pr-4">
            {/* Tab: Identificação do PMOC */}
            <TabsContent value="pmoc" className="space-y-4 mt-0">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Identificação do PMOC
                </h4>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="art">ART/RRT/TRT (Número do Registro)</Label>
                    <Input
                      id="art"
                      placeholder="Ex: ART 1234567890"
                      value={formData.art_rrt_trt}
                      onChange={(e) => updateField('art_rrt_trt', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Número da Anotação de Responsabilidade Técnica do profissional responsável
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disclosure">Local de Disponibilização do PMOC</Label>
                    <Input
                      id="disclosure"
                      placeholder="Ex: Recepção principal, Sala da administração"
                      value={formData.disclosure_location}
                      onChange={(e) => updateField('disclosure_location', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Local físico onde o PMOC fica disponível para consulta
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Responsáveis */}
            <TabsContent value="responsaveis" className="space-y-6 mt-0">
              {/* Responsável Técnico */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Responsável Técnico
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rt_name">Nome Completo</Label>
                    <Input
                      id="rt_name"
                      placeholder="Nome do responsável técnico"
                      value={formData.responsible_technician.name}
                      onChange={(e) => updateField('responsible_technician.name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rt_crea">CREA/CFT</Label>
                    <Input
                      id="rt_crea"
                      placeholder="Ex: CREA-MG 123456/D"
                      value={formData.responsible_technician.crea}
                      onChange={(e) => updateField('responsible_technician.crea', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rt_phone">Telefone</Label>
                    <Input
                      id="rt_phone"
                      placeholder="(00) 00000-0000"
                      value={formData.responsible_technician.phone}
                      onChange={(e) => updateField('responsible_technician.phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rt_email">E-mail</Label>
                    <Input
                      id="rt_email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={formData.responsible_technician.email}
                      onChange={(e) => updateField('responsible_technician.email', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Responsável Legal */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Responsável Legal (Proprietário/Síndico)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rl_name">Nome Completo</Label>
                    <Input
                      id="rl_name"
                      placeholder="Nome do responsável legal"
                      value={formData.responsible_legal.name}
                      onChange={(e) => updateField('responsible_legal.name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rl_role">Cargo/Função</Label>
                    <Input
                      id="rl_role"
                      placeholder="Ex: Síndico, Administrador, Diretor"
                      value={formData.responsible_legal.role}
                      onChange={(e) => updateField('responsible_legal.role', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="rl_doc">CPF/CNPJ</Label>
                    <Input
                      id="rl_doc"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={formData.responsible_legal.document}
                      onChange={(e) => updateField('responsible_legal.document', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: QAI */}
            <TabsContent value="qai" className="space-y-4 mt-0">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Dados de Qualidade do Ar Interior (QAI)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Preencha com os valores da última coleta/análise de QAI realizada no estabelecimento.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qai_date">Data da Última Coleta</Label>
                    <Input
                      id="qai_date"
                      type="date"
                      value={formData.qai.last_sampled_at}
                      onChange={(e) => updateField('qai.last_sampled_at', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_lab">Laboratório</Label>
                    <Input
                      id="qai_lab"
                      placeholder="Nome do laboratório"
                      value={formData.qai.laboratory}
                      onChange={(e) => updateField('qai.laboratory', e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <p className="text-xs font-medium text-muted-foreground">Parâmetros Medidos</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qai_temp">Temperatura (°C)</Label>
                    <Input
                      id="qai_temp"
                      placeholder="Ex: 23.5"
                      value={formData.qai.temperature}
                      onChange={(e) => updateField('qai.temperature', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_humidity">Umidade Relativa (%)</Label>
                    <Input
                      id="qai_humidity"
                      placeholder="Ex: 55"
                      value={formData.qai.humidity}
                      onChange={(e) => updateField('qai.humidity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_co2">CO₂ (ppm)</Label>
                    <Input
                      id="qai_co2"
                      placeholder="Ex: 800"
                      value={formData.qai.co2}
                      onChange={(e) => updateField('qai.co2', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_velocity">Velocidade do Ar (m/s)</Label>
                    <Input
                      id="qai_velocity"
                      placeholder="Ex: 0.15"
                      value={formData.qai.air_velocity}
                      onChange={(e) => updateField('qai.air_velocity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_particulates">Aerodispersoides (µg/m³)</Label>
                    <Input
                      id="qai_particulates"
                      placeholder="Ex: 45"
                      value={formData.qai.particulates}
                      onChange={(e) => updateField('qai.particulates', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qai_fungi">Fungos (UFC/m³)</Label>
                    <Input
                      id="qai_fungi"
                      placeholder="Ex: 350"
                      value={formData.qai.fungi}
                      onChange={(e) => updateField('qai.fungi', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Emergência */}
            <TabsContent value="emergencia" className="space-y-4 mt-0">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contatos de Emergência
                </h4>
                <p className="text-xs text-muted-foreground">
                  Telefones para contato em caso de falhas ou emergências.
                </p>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="em_maintenance">Manutenção / Plantão Técnico</Label>
                    <Input
                      id="em_maintenance"
                      placeholder="(00) 00000-0000"
                      value={formData.emergency_contacts.maintenance}
                      onChange={(e) => updateField('emergency_contacts.maintenance', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em_manager">Administração / Síndico</Label>
                    <Input
                      id="em_manager"
                      placeholder="(00) 00000-0000"
                      value={formData.emergency_contacts.building_manager}
                      onChange={(e) => updateField('emergency_contacts.building_manager', e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium mb-2">Contatos de Emergência Padrão</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Bombeiros: <span className="font-mono">193</span></div>
                    <div>SAMU: <span className="font-mono">192</span></div>
                    <div>Defesa Civil: <span className="font-mono">199</span></div>
                    <div>Polícia: <span className="font-mono">190</span></div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
