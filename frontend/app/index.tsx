import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

const BACKEND_URL = 'https://surveyform-production.up.railway.app';
const SURVEY_URL = typeof window !== 'undefined' ? window.location.origin : 'https://surveyform-rose.vercel.app';

interface Product {
  name: string;
  unit_cost: number;
}

interface ProductEntry {
  product_name: string;
  unit_cost: number;
  retail_price: number | null;
  percent_difference: number | null;
}

interface Survey {
  id: string;
  date_of_survey: string;
  account_manager: string;
  account_name: string;
  state: string;
  region: string;
  county: string;
  products: ProductEntry[];
  created_at: string;
}

type Tab = 'survey' | 'submissions' | 'qrcode';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('survey');
  
  // Survey Form State
  const [dateOfSurvey, setDateOfSurvey] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [accountName, setAccountName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  
  // Data State
  const [states, setStates] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [products, setProducts] = useState<{ [category: string]: Product[] }>({});
  const [retailPrices, setRetailPrices] = useState<{ [key: string]: string }>({});
  
  // Submissions State
  const [submissions, setSubmissions] = useState<Survey[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    fetchStates();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab]);
  
  useEffect(() => {
    if (selectedState) {
      fetchRegions(selectedState);
      setSelectedRegion('');
      setSelectedCounty('');
      setProducts({});
      setRetailPrices({});
    }
  }, [selectedState]);
  
  useEffect(() => {
    if (selectedState && selectedRegion) {
      fetchCounties(selectedState, selectedRegion);
      fetchProducts(selectedState, selectedRegion);
      setSelectedCounty('');
    }
  }, [selectedRegion]);
  
  const fetchStates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/states`);
      const data = await response.json();
      setStates(data.states);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };
  
  const fetchRegions = async (state: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/regions/${encodeURIComponent(state)}`);
      const data = await response.json();
      setRegions(data.regions);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };
  
  const fetchCounties = async (state: string, region: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/counties/${encodeURIComponent(state)}/${encodeURIComponent(region)}`);
      const data = await response.json();
      setCounties(data.counties);
    } catch (error) {
      console.error('Error fetching counties:', error);
    }
  };
  
  const fetchProducts = async (state: string, region: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/products/${encodeURIComponent(state)}/${encodeURIComponent(region)}`);
      const data = await response.json();
      setProducts(data.products);
      const expanded: { [key: string]: boolean } = {};
      Object.keys(data.products).forEach(cat => { expanded[cat] = false; });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };
  
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/surveys`);
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
    setLoading(false);
  };
  
  const calculatePercentDifference = (unitCost: number, retailPrice: number): number => {
    if (unitCost === 0) return 0;
    return ((retailPrice - unitCost) / unitCost) * 100;
  };
  
  const handleRetailPriceChange = (productKey: string, value: string) => {
    setRetailPrices(prev => ({ ...prev, [productKey]: value }));
  };
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  const handleSubmit = async () => {
    if (!dateOfSurvey || !accountManager || !accountName || !selectedState || !selectedRegion || !selectedCounty) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const productEntries: ProductEntry[] = [];
    Object.entries(products).forEach(([category, productList]) => {
      productList.forEach((product, index) => {
        const key = `${category}-${index}`;
        const retailStr = retailPrices[key];
        if (retailStr && retailStr.trim() !== '') {
          const retailPrice = parseFloat(retailStr);
          if (!isNaN(retailPrice)) {
            productEntries.push({
              product_name: product.name,
              unit_cost: product.unit_cost,
              retail_price: retailPrice,
              percent_difference: calculatePercentDifference(product.unit_cost, retailPrice),
            });
          }
        }
      });
    });
    
    if (productEntries.length === 0) {
      Alert.alert('Error', 'Please enter at least one retail price');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_of_survey: dateOfSurvey,
          account_manager: accountManager,
          account_name: accountName,
          state: selectedState,
          region: selectedRegion,
          county: selectedCounty,
          products: productEntries,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Survey submitted successfully!');
        setDateOfSurvey('');
        setAccountManager('');
        setAccountName('');
        setSelectedState('');
        setSelectedRegion('');
        setSelectedCounty('');
        setProducts({});
        setRetailPrices({});
        setRegions([]);
        setCounties([]);
      } else {
        Alert.alert('Error', 'Failed to submit survey');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert('Error', 'Failed to submit survey');
    }
    setSubmitting(false);
  };
  
  const handleExportCSV = async () => {
    try {
      const url = `${BACKEND_URL}/api/surveys/export/csv`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };
  
  const renderDropdown = (
    label: string,
    options: string[],
    selected: string,
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dropdownContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.dropdownOption,
              selected === option && styles.dropdownOptionSelected
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[
              styles.dropdownOptionText,
              selected === option && styles.dropdownOptionTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  const renderQRCode = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.centeredContent}>
      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>Scan to Access Survey</Text>
        <Text style={styles.qrSubtitle}>Share this QR code with your Reps</Text>
        
        <View style={styles.qrBox}>
          <QRCode
            value={SURVEY_URL}
            size={200}
            backgroundColor="#ffffff"
            color="#000000"
          />
        </View>
        
        <Text style={styles.qrUrl}>{SURVEY_URL}</Text>
        
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigator.clipboard.writeText(SURVEY_URL);
              Alert.alert('Copied', 'URL copied to clipboard!');
            }
          }}
        >
          <Ionicons name="copy-outline" size={18} color="#fff" />
          <Text style={styles.copyButtonText}>Copy Link</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  const renderSurveyForm = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.centeredContent}>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Survey Information</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Survey *</Text>
          <TextInput
            style={styles.input}
            value={dateOfSurvey}
            onChangeText={setDateOfSurvey}
            placeholder="e.g., 07/15/2025"
            placeholderTextColor="#666"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Account Manager *</Text>
          <TextInput
            style={styles.input}
            value={accountManager}
            onChangeText={setAccountManager}
            placeholder="Enter name"
            placeholderTextColor="#666"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Account Name *</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Enter account"
            placeholderTextColor="#666"
          />
        </View>
        
        <Text style={styles.sectionTitle}>Location</Text>
        
        {renderDropdown('State *', states, selectedState, setSelectedState)}
        
        {selectedState && renderDropdown('Region *', regions, selectedRegion, setSelectedRegion)}
        
        {selectedRegion && renderDropdown('County *', counties, selectedCounty, setSelectedCounty)}
        
        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : Object.keys(products).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Products & Pricing</Text>
            <Text style={styles.instructions}>
              Enter retail prices. % difference auto-calculated.
            </Text>
            
            {Object.entries(products).map(([category, productList]) => (
              <View key={category} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Ionicons
                    name={expandedCategories[category] ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
                
                {expandedCategories[category] && (
                  <View style={styles.productList}>
                    {productList.map((product, index) => {
                      const key = `${category}-${index}`;
                      const retailValue = retailPrices[key] || '';
                      const retailNum = parseFloat(retailValue);
                      const percentDiff = !isNaN(retailNum) && retailValue !== ''
                        ? calculatePercentDifference(product.unit_cost, retailNum)
                        : null;
                      
                      return (
                        <View key={key} style={styles.productRow}>
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.unitCost}>Unit: ${product.unit_cost.toFixed(2)}</Text>
                          </View>
                          <View style={styles.priceInputContainer}>
                            <TextInput
                              style={styles.priceInput}
                              value={retailValue}
                              onChangeText={(value) => handleRetailPriceChange(key, value)}
                              placeholder="$"
                              placeholderTextColor="#666"
                              keyboardType="decimal-pad"
                            />
                            {percentDiff !== null && (
                              <Text style={[
                                styles.percentDiff,
                                percentDiff >= 0 ? styles.positive : styles.negative
                              ]}>
                                {percentDiff >= 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
        
        {Object.keys(products).length > 0 && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
  
  const renderSubmissions = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.centeredContent}>
      <View style={styles.submissionsContainer}>
        <View style={styles.submissionsHeader}>
          <Text style={styles.sectionTitle}>Submissions</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.exportButtonText}>CSV</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : submissions.length === 0 ? (
          <Text style={styles.noData}>No submissions yet</Text>
        ) : (
          submissions.map((survey) => (
            <View key={survey.id} style={styles.submissionCard}>
              <View style={styles.submissionHeader}>
                <Text style={styles.submissionDate}>{survey.date_of_survey}</Text>
                <Text style={styles.submissionLocation}>
                  {survey.state} • {survey.region} • {survey.county}
                </Text>
              </View>
              <View style={styles.submissionDetails}>
                <Text style={styles.submissionText}>
                  <Text style={styles.bold}>Manager:</Text> {survey.account_manager}
                </Text>
                <Text style={styles.submissionText}>
                  <Text style={styles.bold}>Account:</Text> {survey.account_name}
                </Text>
                <Text style={styles.submissionText}>
                  <Text style={styles.bold}>Products:</Text> {survey.products.length}
                </Text>
              </View>
              <View style={styles.productsSummary}>
                {survey.products.slice(0, 3).map((product, idx) => (
                  <View key={idx} style={styles.productSummaryRow}>
                    <Text style={styles.productSummaryName} numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <View style={styles.productSummaryPrices}>
                      <Text style={styles.productSummaryPrice}>
                        ${product.retail_price?.toFixed(2)}
                      </Text>
                      <Text style={[
                        styles.productSummaryPercent,
                        (product.percent_difference || 0) >= 0 ? styles.positive : styles.negative
                      ]}>
                        {(product.percent_difference || 0) >= 0 ? '+' : ''}
                        {product.percent_difference?.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                ))}
                {survey.products.length > 3 && (
                  <Text style={styles.moreProducts}>
                    +{survey.products.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Price Survey Tool</Text>
        <Text style={styles.headerSubtitle}>Independent C-Store Survey</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'survey' && styles.activeTab]}
          onPress={() => setActiveTab('survey')}
        >
          <Ionicons name="create-outline" size={18} color={activeTab === 'survey' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'survey' && styles.activeTabText]}>Survey</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submissions' && styles.activeTab]}
          onPress={() => setActiveTab('submissions')}
        >
          <Ionicons name="list-outline" size={18} color={activeTab === 'submissions' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>Data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qrcode' && styles.activeTab]}
          onPress={() => setActiveTab('qrcode')}
        >
          <Ionicons name="qr-code-outline" size={18} color={activeTab === 'qrcode' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'qrcode' && styles.activeTabText]}>QR Code</Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'survey' && renderSurveyForm()}
      {activeTab === 'submissions' && renderSubmissions()}
      {activeTab === 'qrcode' && renderQRCode()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#252525',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centeredContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  submissionsContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    width: 280,
    textAlign: 'center',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#ccc',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#252525',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  productList: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 13,
    color: '#ddd',
    marginBottom: 2,
  },
  unitCost: {
    fontSize: 11,
    color: '#777',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceInput: {
    width: 60,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    textAlign: 'center',
  },
  percentDiff: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  loader: {
    marginVertical: 20,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  submissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 30,
  },
  submissionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  submissionHeader: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    alignItems: 'center',
  },
  submissionDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  submissionLocation: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    textAlign: 'center',
  },
  submissionDetails: {
    marginBottom: 10,
    alignItems: 'center',
  },
  submissionText: {
    fontSize: 13,
    color: '#bbb',
    marginBottom: 2,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '600',
    color: '#ddd',
  },
  productsSummary: {
    backgroundColor: '#222',
    borderRadius: 6,
    padding: 10,
  },
  productSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productSummaryName: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
    paddingRight: 8,
  },
  productSummaryPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productSummaryPrice: {
    fontSize: 12,
    color: '#ddd',
    fontWeight: '500',
  },
  productSummaryPercent: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  moreProducts: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  // QR Code styles
  qrContainer: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
