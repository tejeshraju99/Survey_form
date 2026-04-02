import React, { useState, useEffect, useCallback } from 'react';
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

type Tab = 'survey' | 'submissions';

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
  
  // Fetch states on mount
  useEffect(() => {
    fetchStates();
  }, []);
  
  // Fetch submissions when tab changes
  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab]);
  
  // Fetch regions when state changes
  useEffect(() => {
    if (selectedState) {
      fetchRegions(selectedState);
      setSelectedRegion('');
      setSelectedCounty('');
      setProducts({});
      setRetailPrices({});
    }
  }, [selectedState]);
  
  // Fetch counties and products when region changes
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
      // Initialize expanded categories
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
    
    // Collect products with retail prices
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
        // Reset form
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
    disabled: boolean = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.dropdownContainer, disabled && styles.disabledDropdown]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.dropdownOption,
              selected === option && styles.dropdownOptionSelected
            ]}
            onPress={() => !disabled && onSelect(option)}
            disabled={disabled}
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
  
  const renderSurveyForm = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Survey Information</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Survey *</Text>
          <TextInput
            style={styles.input}
            value={dateOfSurvey}
            onChangeText={setDateOfSurvey}
            placeholder="e.g., 07/15/2025"
            placeholderTextColor="#888"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Account Manager *</Text>
          <TextInput
            style={styles.input}
            value={accountManager}
            onChangeText={setAccountManager}
            placeholder="Enter Account Manager name"
            placeholderTextColor="#888"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Account Name *</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Enter Account Name"
            placeholderTextColor="#888"
          />
        </View>
        
        <Text style={styles.sectionTitle}>Location</Text>
        
        {renderDropdown('State *', states, selectedState, setSelectedState)}
        
        {selectedState && (
          renderDropdown('Region *', regions, selectedRegion, setSelectedRegion)
        )}
        
        {selectedRegion && (
          renderDropdown('County *', counties, selectedCounty, setSelectedCounty)
        )}
        
        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : Object.keys(products).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Products & Pricing</Text>
            <Text style={styles.instructions}>
              Enter retail prices for products. % difference will be calculated automatically.
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
                    size={24}
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
                            <Text style={styles.unitCost}>Unit Cost: ${product.unit_cost.toFixed(2)}</Text>
                          </View>
                          <View style={styles.priceInputContainer}>
                            <TextInput
                              style={styles.priceInput}
                              value={retailValue}
                              onChangeText={(value) => handleRetailPriceChange(key, value)}
                              placeholder="Retail"
                              placeholderTextColor="#888"
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
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.submissionsContainer}>
        <View style={styles.submissionsHeader}>
          <Text style={styles.sectionTitle}>Survey Submissions</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>Export CSV</Text>
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
                <Text style={styles.submissionManager}>
                  <Text style={styles.bold}>Account Manager:</Text> {survey.account_manager}
                </Text>
                <Text style={styles.submissionAccount}>
                  <Text style={styles.bold}>Account Name:</Text> {survey.account_name}
                </Text>
                <Text style={styles.submissionProductCount}>
                  <Text style={styles.bold}>Products Surveyed:</Text> {survey.products.length}
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
                    +{survey.products.length - 3} more products
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
          <Ionicons
            name="clipboard-outline"
            size={20}
            color={activeTab === 'survey' ? '#fff' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'survey' && styles.activeTabText]}>
            New Survey
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submissions' && styles.activeTab]}
          onPress={() => setActiveTab('submissions')}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === 'submissions' ? '#fff' : '#888'}
          />
          <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>
            Submissions
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'survey' ? renderSurveyForm() : renderSubmissions()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#252525',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  submissionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#252525',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  disabledDropdown: {
    opacity: 0.5,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#ccc',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 13,
    color: '#888',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  categoryContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#2a2a2a',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  productList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  productInfo: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  unitCost: {
    fontSize: 12,
    color: '#888',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    width: 80,
    backgroundColor: '#252525',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    textAlign: 'center',
  },
  percentDiff: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  loader: {
    marginVertical: 30,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
  submissionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  submissionHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  submissionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  submissionLocation: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  submissionDetails: {
    marginBottom: 12,
  },
  submissionManager: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  submissionAccount: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  submissionProductCount: {
    fontSize: 14,
    color: '#ccc',
  },
  bold: {
    fontWeight: '600',
    color: '#fff',
  },
  productsSummary: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
  },
  productSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  productSummaryName: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    paddingRight: 10,
  },
  productSummaryPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productSummaryPrice: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  productSummaryPercent: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  moreProducts: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
